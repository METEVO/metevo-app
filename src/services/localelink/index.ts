import { ENV } from '../../config/env';
import {
  LocalLinkCredentials,
  decodeLocalLinkFrame,
  encodeLocalLinkFrame,
  frameFromBase64,
  frameToBase64,
} from './localLinkFrame';
import { LocalLink, LocalLinkGroup } from './mockLocalLink';
import { createMockLocalLink } from './mockLocalLink';

export { FRAME_SIZE, decodeLocalLinkFrame, encodeLocalLinkFrame, LocalLinkCredentials } from './localLinkFrame';
export { LocalLink, LocalLinkGroup } from './mockLocalLink';

/**
 * Native module surface (app.metevo.wallet.localelink.MetevoLocalLinkModule).
 * Frames cross the bridge as base64: the 240-byte layout stays defined in
 * localLinkFrame.ts (single source of truth, unit-tested), the native side
 * only stores and serves bytes.
 */
interface NativeLocalLinkModule {
  startTagEmulation(frameBase64: string): Promise<void>;
  startGroup(port: number): Promise<LocalLinkGroup>;
  connectToGroup(ssid: string, password: string, timeoutMs: number): Promise<void>;
  serveInvoice(sessionId: string, invoice: string): Promise<void>;
  readNfcCredentials(timeoutMs: number): Promise<string>;
  fetchInvoice(host: string, port: number, sessionId: string, timeoutMs: number): Promise<string>;
  stopGroup(): Promise<void>;
  setKeepScreenOn(enabled: boolean): Promise<void>;
}

function loadNativeModule(): NativeLocalLinkModule | null {
  try {
    // Lazy require: react-native resolves only inside the app bundle.
    const { NativeModules } = require('react-native') as {
      NativeModules?: { MetevoLocalLinkModule?: NativeLocalLinkModule };
    };
    return NativeModules?.MetevoLocalLinkModule ?? null;
  } catch {
    return null;
  }
}

/** Whether the real NFC / Wi-Fi Direct module is present (debug APK). */
export function isLocalLinkNative(): boolean {
  return loadNativeModule() !== null;
}

function createNativeLocalLink(native: NativeLocalLinkModule): LocalLink {
  return {
    async startTagEmulation(credentials) {
      await native.startTagEmulation(frameToBase64(encodeLocalLinkFrame(credentials)));
    },
    async startGroup(port) {
      return native.startGroup(port);
    },
    async connectToGroup(ssid, password, timeoutMs) {
      await native.connectToGroup(ssid, password, timeoutMs);
    },
    async serveInvoice(params) {
      await native.serveInvoice(params.sessionId, params.invoice);
    },
    async fetchInvoice(params) {
      return native.fetchInvoice(params.host, params.port, params.sessionId, params.timeoutMs);
    },
    async stopGroup() {
      await native.stopGroup();
    },
    async setKeepScreenOn(enabled) {
      await native.setKeepScreenOn(enabled);
    },
    isRunning() {
      // The native module owns its lifecycle state; the JS side never
      // caches it (ask the module through a method call when needed).
      return true;
    },
  };
}

/**
 * The local-link singleton for this session. Falls back to the mock when
 * the native module is absent (Expo Go, Node tests), so the receive flow
 * always has a working implementation and teardown stays exercisable.
 */
export function getLocalLink(): LocalLink {
  const native = loadNativeModule();
  return native !== null
    ? createNativeLocalLink(native)
    : createMockLocalLink(ENV.EXPO_PUBLIC_LOCAL_LINK_PORT);
}

/**
 * Payer-side NFC read: taps the receiver's tag (private AID
 * F04D455445564F01) and decodes the 240-byte credential frame. Only the
 * native module can read NFC; the mock path throws, keeping the receive
 * flow demoable while the payer tap needs a real device.
 */
export async function readLocalLinkCredentials(timeoutMs: number): Promise<LocalLinkCredentials> {
  const native = loadNativeModule();
  if (native === null) {
    throw new Error('local link: NFC requires the native module (debug APK build)');
  }
  const frameBase64 = await native.readNfcCredentials(timeoutMs);
  return decodeLocalLinkFrame(frameFromBase64(frameBase64));
}
