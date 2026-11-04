import { encodeContactLink, decodeContactLink, MAX_CONTACT_LINK_BYTES } from './contactLink';

/**
 * Contact sharing over NFC, separate from the in-person payment local link:
 * its own private AID, its own HCE service and state, so a contact tap can
 * never reach or reset a payment session.
 *
 * Frame served by the sharing phone and read with ISO 7816-4 READ BINARY:
 *   [0..1]  payload length, big-endian
 *   [2..]   canonical contact link (metevo://contact?...), plain ASCII:
 *           names, phones and emails are percent-encoded inside it
 * The frame is built and checked here; the Kotlin side only stores and
 * serves bytes, like the local-link credential frame.
 */
export const CONTACT_NFC_AID = 'F04D455445564F02';
const LENGTH_HEADER_BYTES = 2;
export const MAX_CONTACT_NFC_FRAME_BYTES = LENGTH_HEADER_BYTES + MAX_CONTACT_LINK_BYTES;

export type ContactNfcStatus = 'ready' | 'disabled' | 'unsupported';

export function encodeContactNfcFrame(link: string): Uint8Array {
  const canonical = encodeContactLink(decodeContactLink(link));
  const payload = Uint8Array.from(canonical, (character) => character.charCodeAt(0));
  const frame = new Uint8Array(LENGTH_HEADER_BYTES + payload.length);
  frame[0] = (payload.length >> 8) & 0xff;
  frame[1] = payload.length & 0xff;
  frame.set(payload, LENGTH_HEADER_BYTES);
  return frame;
}

/** Returns the raw link text; the import card validates it like any link. */
export function decodeContactNfcFrame(frame: Uint8Array): string {
  if (frame.length < LENGTH_HEADER_BYTES || frame.length > MAX_CONTACT_NFC_FRAME_BYTES) {
    throw new Error('contact nfc: frame has an invalid size');
  }
  const length = (frame[0] << 8) | frame[1];
  if (length === 0 || length !== frame.length - LENGTH_HEADER_BYTES) {
    throw new Error('contact nfc: frame length does not match its payload');
  }
  const payload = frame.subarray(LENGTH_HEADER_BYTES);
  if (payload.some((byte) => byte < 0x20 || byte > 0x7e)) {
    throw new Error('contact nfc: payload is not a printable ASCII link');
  }
  return String.fromCharCode(...payload);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** app.metevo.wallet.contactnfc.MetevoContactNfcModule */
interface NativeContactNfcModule {
  getStatus(): Promise<ContactNfcStatus>;
  startSharing(frameBase64: string): Promise<void>;
  stopSharing(): Promise<void>;
  readFrame(timeoutMs: number): Promise<string>;
  cancelRead(): Promise<void>;
  openSettings(): Promise<void>;
}

function nativeModule(): NativeContactNfcModule | null {
  try {
    // Lazy require: react-native resolves only inside the app bundle.
    const { NativeModules } = require('react-native') as {
      NativeModules?: { MetevoContactNfcModule?: NativeContactNfcModule };
    };
    return NativeModules?.MetevoContactNfcModule ?? null;
  } catch {
    return null;
  }
}

/** Native error codes the UI turns into plain sentences. */
export type ContactNfcReadError = 'timeout' | 'cancelled' | 'not-metevo' | 'unavailable' | 'failed';

export class ContactNfcError extends Error {
  constructor(public readonly code: ContactNfcReadError) {
    super(`contact nfc: ${code}`);
    this.name = 'ContactNfcError';
  }
}

const NATIVE_ERROR_CODES: Record<string, ContactNfcReadError> = {
  ETIMEOUT: 'timeout',
  ECANCELLED: 'cancelled',
  ENOTMETEVO: 'not-metevo',
  ENFC: 'unavailable',
};

export async function getContactNfcStatus(): Promise<ContactNfcStatus> {
  const native = nativeModule();
  if (native === null) return 'unsupported';
  try {
    return await native.getStatus();
  } catch {
    return 'unsupported';
  }
}

/** Serves this link to the next phone that reads it, until stopped. */
export async function startContactNfcSharing(link: string): Promise<void> {
  const native = nativeModule();
  if (native === null) throw new ContactNfcError('unavailable');
  await native.startSharing(bytesToBase64(encodeContactNfcFrame(link)));
}

export async function stopContactNfcSharing(): Promise<void> {
  await nativeModule()?.stopSharing().catch(() => undefined);
}

/** Waits for a sharing phone; resolves with the link text it served. */
export async function readContactNfcLink(timeoutMs: number): Promise<string> {
  const native = nativeModule();
  if (native === null) throw new ContactNfcError('unavailable');
  let frameBase64: string;
  try {
    frameBase64 = await native.readFrame(timeoutMs);
  } catch (cause) {
    const code = (cause as { code?: string } | null)?.code;
    throw new ContactNfcError(code !== undefined && code in NATIVE_ERROR_CODES ? NATIVE_ERROR_CODES[code] : 'failed');
  }
  try {
    return decodeContactNfcFrame(base64ToBytes(frameBase64));
  } catch {
    throw new ContactNfcError('not-metevo');
  }
}

export async function cancelContactNfcRead(): Promise<void> {
  await nativeModule()?.cancelRead().catch(() => undefined);
}

export async function openNfcSettings(): Promise<void> {
  await nativeModule()?.openSettings().catch(() => undefined);
}
