/**
 * METEVO local-link credential frame: the 240-byte NFC payload the
 * receiver serves over the private AID (F04D455445564F01) and the payer
 * reads after the tap.
 *
 * Layout (big-endian byte offsets, NUL-padded, ASCII fields):
 *   [0..6]    magic "METEVO1"
 *   [7..70]   ssid       (64 bytes, NUL-padded)   - Wi-Fi Direct group SSID
 *   [71..166] password   (96 bytes, NUL-padded)   - group WPA2 passphrase
 *   [167..198] sessionId (32 bytes, NUL-padded)   - invoice fetch session id
 *   [199..239] reserved  (41 bytes, zero)         - future protocol fields
 *
 * This codec is the single protocol definition; the Kotlin module receives
 * and returns the frame as base64 and never parses the fields itself.
 */

export const FRAME_SIZE = 240;

export interface LocalLinkCredentials {
  ssid: string;
  password: string;
  sessionId: string;
}

const MAGIC = 'METEVO1';
const OFFSETS = { magic: 0, ssid: 7, password: 71, sessionId: 167 } as const;
const LENGTHS = { magic: 7, ssid: 64, password: 96, sessionId: 32 } as const;

function encodeAsciiField(value: string, length: number, field: string): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > length) {
    throw new Error(
      `local link frame: ${field} exceeds ${length} bytes (${bytes.length})`,
    );
    // Note: the limit is on BYTES; multi-byte characters reduce the usable
    // character count accordingly.
  }
  const out = new Uint8Array(length);
  out.set(bytes);
  return out;
}

function decodeAsciiField(frame: Uint8Array, offset: number, length: number): string {
  let end = offset + length;
  while (end > offset && frame[end - 1] === 0) {
    end -= 1;
  }
  return new TextDecoder().decode(frame.slice(offset, end));
}

export function encodeLocalLinkFrame(credentials: LocalLinkCredentials): Uint8Array {
  const frame = new Uint8Array(FRAME_SIZE);
  frame.set(encodeAsciiField(MAGIC, LENGTHS.magic, 'magic'), OFFSETS.magic);
  frame.set(encodeAsciiField(credentials.ssid, LENGTHS.ssid, 'ssid'), OFFSETS.ssid);
  frame.set(
    encodeAsciiField(credentials.password, LENGTHS.password, 'password'),
    OFFSETS.password,
  );
  frame.set(
    encodeAsciiField(credentials.sessionId, LENGTHS.sessionId, 'sessionId'),
    OFFSETS.sessionId,
  );
  return frame;
}

export function decodeLocalLinkFrame(frame: Uint8Array): LocalLinkCredentials {
  if (frame.length !== FRAME_SIZE) {
    throw new Error(`local link frame: expected ${FRAME_SIZE} bytes, got ${frame.length}`);
  }
  const magic = decodeAsciiField(frame, OFFSETS.magic, LENGTHS.magic);
  if (magic !== MAGIC) {
    throw new Error('local link frame: wrong magic (not a METEVO tag)');
  }
  return {
    ssid: decodeAsciiField(frame, OFFSETS.ssid, LENGTHS.ssid),
    password: decodeAsciiField(frame, OFFSETS.password, LENGTHS.password),
    sessionId: decodeAsciiField(frame, OFFSETS.sessionId, LENGTHS.sessionId),
  };
}

/** Base64 helpers for the native bridge (Kotlin receives/returns base64).
 * btoa/atob exist in React Native (Hermes) and Node >= 16 (tests). */
export function frameToBase64(frame: Uint8Array): string {
  let binary = '';
  for (const byte of frame) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function frameFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const frame = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    frame[index] = binary.charCodeAt(index);
  }
  return frame;
}
