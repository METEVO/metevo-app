import * as FileSystem from 'expo-file-system/legacy';
import { isDevice as isPhysicalDevice, totalMemory as deviceTotalMemory } from 'expo-device';

import { ENV } from '../config/env';
import { localModelPath } from './localModel';
import { loadQwenModel, releaseQwenModel } from './qwen';
import { initializeWhisper, releaseWhisper } from './whisper';

/**
 * The one runtime service behind the voice agent (design phase 1): it owns
 * model provisioning — presence checks, downloads, loads, unloads — and
 * reports per-model status instead of throwing. UI code subscribes; only
 * the orchestrator drives it.
 *
 * Two hard rules come from what breaks on a real phone:
 * - the native worklet can abort the whole process in ways JS cannot
 *   catch, so a boot marker records every boot attempt and the next run
 *   learns about the crash;
 * - the registry hub is not reachable from every demo network, so the LLM
 *   loads local-first (adb-sideloaded file, then a plain HTTPS download)
 *   and only falls back to the registry.
 */

export type VoiceModelKind = 'stt' | 'llm' | 'tts';
export type ModelState = 'absent' | 'downloading' | 'loading' | 'ready' | 'error';

export interface RuntimeSnapshot {
  statuses: Record<VoiceModelKind, ModelState>;
  errors: Record<VoiceModelKind, string | null>;
  /** Set when the previous run died while the worklet was booting. */
  crashedLastBoot: boolean;
  /** Latest human-readable step (download progress, load stage). */
  statusMessage: string | null;
}

interface ModelSpec {
  kind: VoiceModelKind;
  modelType: 'whispercpp-transcription' | 'llamacpp-completion' | 'tts-ggml';
  /** Subfolder of <documents>/models the sideloaded file lives in. */
  folder: string;
  fileName: string;
  /** Exact byte size, known for downloadable models; checked after download. */
  bytes?: number;
  /** Plain HTTPS source used when the sideloaded file is absent. */
  httpUrl?: string;
  minRamGb: number;
}

const LLM_BYTES = 382_156_480;
const LLM_HTTP_URL =
  'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/50968a4468ef4233ed78cd7c3de230dd1d61a56b/Qwen3-0.6B-Q4_0.gguf';

const MODEL_SPECS: Record<VoiceModelKind, ModelSpec> = {
  stt: {
    kind: 'stt',
    modelType: 'whispercpp-transcription',
    folder: 'whisper',
    fileName: ENV.EXPO_PUBLIC_QVAC_WHISPER_MODEL_ENGLISH ?? 'en-small.bin',
    minRamGb: 2,
  },
  llm: {
    kind: 'llm',
    modelType: 'llamacpp-completion',
    folder: 'qwen',
    fileName: ENV.EXPO_PUBLIC_QVAC_LLM_MODEL_FILE ?? 'Qwen3-0.6B-Q4_0.gguf',
    bytes: LLM_BYTES,
    httpUrl: LLM_HTTP_URL,
    minRamGb: 2.5,
  },
  tts: {
    kind: 'tts',
    modelType: 'tts-ggml',
    folder: 'tts',
    fileName: 'supertonic.bin',
    minRamGb: 4,
  },
};

/** Neural TTS needs the tts-ggml plugin inside the worker bundle; this
 * build ships two plugins (STT + LLM) so replies use the system voice.
 * Recorded here so the runtime reports the capability instead of failing
 * deep inside the worklet. */
const TTS_PLUGIN_BUNDLED = false;

const BUSY_MARKER_TEXT = 'booting';
const BOOT_MARKER_FILE = 'qvac-boot-marker';
const DOWNLOAD_SUFFIX = '.part';

class QvacRuntime {
  private statuses: Record<VoiceModelKind, ModelState> = {
    stt: 'absent',
    llm: 'absent',
    tts: 'absent',
  };
  private errors: Record<VoiceModelKind, string | null> = {
    stt: null,
    llm: null,
    tts: null,
  };
  private crashedLastBoot = false;
  private statusMessage: string | null = null;
  private inflight = new Map<VoiceModelKind, Promise<void>>();
  private listeners = new Set<(snapshot: RuntimeSnapshot) => void>();

  /** Subscribes to runtime state; returns the unsubscribe function. */
  subscribe(listener: (snapshot: RuntimeSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): RuntimeSnapshot {
    return {
      statuses: { ...this.statuses },
      errors: { ...this.errors },
      crashedLastBoot: this.crashedLastBoot,
      statusMessage: this.statusMessage,
    };
  }

  /** Whether the kind can actually load in this build. */
  isSupported(kind: VoiceModelKind): boolean {
    return !(kind === 'tts' && !TTS_PLUGIN_BUNDLED);
  }

  /**
   * Provisions one model: single-flight, checked, and reported. Resolves
   * when the model is ready; failures land in the per-model error, never
   * thrown — the caller reads the snapshot.
   */
  async ensure(kind: VoiceModelKind): Promise<void> {
    if (this.statuses[kind] === 'ready') {
      return;
    }
    const existing = this.inflight.get(kind);
    if (existing) {
      return existing;
    }
    const task = this.provision(kind).finally(() => {
      this.inflight.delete(kind);
    });
    this.inflight.set(kind, task);
    return task;
  }

  /** Frees a loaded model (memory-pressure and idling support). */
  async unload(kind: VoiceModelKind): Promise<void> {
    try {
      if (kind === 'stt') await releaseWhisper();
      if (kind === 'llm') await releaseQwenModel();
      this.statuses[kind] = 'absent';
      this.publish();
    } catch (cause) {
      this.setError(kind, cause);
    }
  }

  async unloadAll(): Promise<void> {
    await Promise.allSettled([
      this.unload('stt'),
      this.unload('llm'),
      this.unload('tts'),
    ]);
  }

  private async provision(kind: VoiceModelKind): Promise<void> {
    const spec = MODEL_SPECS[kind];
    if (!this.isSupported(kind)) {
      this.setError(
        kind,
        'Neural TTS is not enabled in this build; replies use the system voice.',
      );
      return;
    }
    if (isPhysicalDevice === false) {
      this.setError(kind, 'QVAC voice runs on a physical device, not an emulator.');
      return;
    }
    const totalRamGb = (deviceTotalMemory ?? 0) / 1e9;
    if (totalRamGb > 0 && totalRamGb < spec.minRamGb) {
      this.setError(
        kind,
        `This phone has about ${totalRamGb.toFixed(1)} GB of RAM; the ${kind} model needs at least ${spec.minRamGb} GB.`,
      );
      return;
    }

    await this.noteBootCrashGuard(kind);

    const localPath = localModelPath(spec.folder, spec.fileName);
    if (localPath === null && spec.httpUrl !== undefined && spec.bytes !== undefined) {
      const ok = await this.downloadModel(
        kind,
        spec.bytes,
        spec.httpUrl,
        spec.folder,
        spec.fileName,
      );
      if (!ok) {
        return; // error already recorded
      }
    }

    const path = localModelPath(spec.folder, spec.fileName);
    if (path === null) {
      this.setError(
        kind,
        `The ${kind} model is not on this phone yet. Push ${spec.fileName} into the app's models/${spec.folder}/ folder.`,
      );
      return;
    }

    this.statuses[kind] = 'loading';
    this.statusMessage = `Loading the ${kind} model…`;
    this.publish();
    try {
      if (kind === 'stt') {
        await initializeWhisper('en', path);
      } else if (kind === 'llm') {
        await loadQwenModel(path);
      }
      this.statuses[kind] = 'ready';
      this.errors[kind] = null;
      this.statusMessage = null;
      await this.clearBootMarker();
      this.publish();
    } catch (cause) {
      this.setError(kind, cause);
    }
  }

  /**
   * The boot-crash guard: the marker is written before the first worklet
   * boot and cleared once any model reaches ready. A leftover marker means
   * the previous run died inside native code — surfaced to the user, then
   * cleared, because the explicit talk press is itself the opt-in to retry.
   */
  private async noteBootCrashGuard(kind: VoiceModelKind): Promise<void> {
    const markerUri = `${FileSystem.documentDirectory ?? ''}${BOOT_MARKER_FILE}`;
    try {
      const marker = await FileSystem.readAsStringAsync(markerUri);
      if (marker === BUSY_MARKER_TEXT && !this.crashedLastBoot) {
        this.crashedLastBoot = true;
        this.statusMessage = 'The voice engine crashed on the last attempt; retrying now.';
      }
      await FileSystem.writeAsStringAsync(markerUri, BUSY_MARKER_TEXT);
    } catch {
      // First ever boot: no marker yet — write it for the next run.
      try {
        await FileSystem.writeAsStringAsync(markerUri, BUSY_MARKER_TEXT);
      } catch {
        // A read-only sandbox would break everything else too; ignore.
      }
    }
    void kind;
  }

  private async clearBootMarker(): Promise<void> {
    const markerUri = `${FileSystem.documentDirectory ?? ''}${BOOT_MARKER_FILE}`;
    try {
      await FileSystem.deleteAsync(markerUri, { idempotent: true });
    } catch {
      // Nothing depends on the deletion succeeding.
    }
  }

  /** Plain HTTPS download with the plan's hygiene: .part file, HTTP status
   * check, exact size check, then rename. Reports progress to the UI. */
  private async downloadModel(
    kind: VoiceModelKind,
    bytes: number,
    httpUrl: string,
    folder: string,
    fileName: string,
  ): Promise<boolean> {
    const baseDir = `${FileSystem.documentDirectory ?? ''}models/${folder}`;
    const finalPath = `${baseDir}/${fileName}`;
    const partPath = `${finalPath}${DOWNLOAD_SUFFIX}`;

    try {
      const freeKb = await FileSystem.getFreeDiskStorageAsync();
      // The legacy API reports kilobytes; require the model plus headroom.
      const requiredKb = Math.ceil((bytes * 1.2) / 1024);
      if (typeof freeKb === 'number' && freeKb < requiredKb) {
        this.setError(kind, 'Not enough free storage for the voice model download.');
        return false;
      }
    } catch {
      // Storage probing is best-effort; the download fails loudly instead.
    }

    this.statuses[kind] = 'downloading';
    this.statusMessage = `Downloading the ${kind} model 0%…`;
    this.publish();
    try {
      let lastReportedPercent = -1;
      const downloader = FileSystem.createDownloadResumable(
        httpUrl,
        partPath,
        {},
        (progress) => {
          const percent = Math.floor(
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100,
          );
          if (percent !== lastReportedPercent) {
            lastReportedPercent = percent;
            this.statusMessage = `Downloading the ${kind} model ${percent}%…`;
            this.publish();
          }
        },
      );
      const result = await downloader.downloadAsync();
      if (!result || result.status !== 200) {
        await FileSystem.deleteAsync(partPath, { idempotent: true });
        this.setError(
          kind,
          `The ${kind} model download failed (HTTP ${result?.status ?? 'no response'}).`,
        );
        return false;
      }
      const info = await FileSystem.getInfoAsync(partPath);
      if (!info.exists || info.size !== bytes) {
        await FileSystem.deleteAsync(partPath, { idempotent: true });
        this.setError(
          kind,
          `The downloaded ${kind} model has the wrong size (${info.exists ? info.size : 'missing'}); deleted. Check the connection and retry.`,
        );
        return false;
      }
      await FileSystem.moveAsync({ from: partPath, to: finalPath });
      return true;
    } catch (cause) {
      await FileSystem.deleteAsync(partPath, { idempotent: true }).catch(() => undefined);
      this.setError(
        kind,
        `The ${kind} model download failed: ${cause instanceof Error ? cause.message : 'unknown error'}.`,
      );
      return false;
    }
  }

  private setError(kind: VoiceModelKind, cause: unknown): void {
    const message = cause instanceof Error ? cause.message : String(cause);
    this.errors[kind] = message;
    this.statuses[kind] = 'error';
    this.statusMessage = null;
    this.publish();
    // The cause chain carries the host's own failure (e.g. why an addon
    // refused to load); walk it so the diagnostics are not lost.
    const chain: string[] = [];
    let current: unknown = cause;
    for (let depth = 0; current instanceof Error && depth < 6; depth += 1) {
      chain.push(current.message);
      const next = (current as Error & { cause?: unknown }).cause;
      if (next === undefined || next === null) break;
      current = next;
      if (!(current instanceof Error)) {
        chain.push(String(current));
        break;
      }
    }
    console.warn(`[metevo] qvac runtime: ${kind} failed: ${chain.join(' <- ')}`);
  }

  private publish(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const voiceRuntime = new QvacRuntime();
