import { encodeContactLink } from '../../src/services/metevo/contactLink';
import {
  base64ToBytes,
  bytesToBase64,
  decodeContactNfcFrame,
  encodeContactNfcFrame,
  getContactNfcStatus,
  MAX_CONTACT_NFC_FRAME_BYTES,
  readContactNfcLink,
} from '../../src/services/metevo/contactNfc';

jest.mock('expo-secure-store', () => ({}));

const NODE = `02${'ab'.repeat(32)}`;
const LINK = encodeContactLink({ name: 'Èdi Rossi', nodePubkey: NODE, phone: '+393331234567', email: 'edi@example.com' });

describe('contact NFC frame', () => {
  test('round-trips a canonical link with its length header', () => {
    const frame = encodeContactNfcFrame(LINK);
    expect((frame[0] << 8) | frame[1]).toBe(frame.length - 2);
    expect(decodeContactNfcFrame(frame)).toBe(LINK);
    expect(decodeContactNfcFrame(base64ToBytes(bytesToBase64(frame)))).toBe(LINK);
  });

  test('refuses to serve anything that is not a valid contact link', () => {
    expect(() => encodeContactNfcFrame('https://example.com')).toThrow();
    expect(() => encodeContactNfcFrame(`metevo://contact?v=1&name=Maria&node=${NODE.slice(0, -2)}`)).toThrow();
  });

  test('rejects truncated, padded, empty or binary frames', () => {
    const frame = encodeContactNfcFrame(LINK);
    expect(() => decodeContactNfcFrame(frame.subarray(0, frame.length - 1))).toThrow('length');
    expect(() => decodeContactNfcFrame(Uint8Array.from([...frame, 0]))).toThrow('length');
    expect(() => decodeContactNfcFrame(Uint8Array.from([0, 0]))).toThrow('length');
    expect(() => decodeContactNfcFrame(Uint8Array.from([0, 2, 0x6d, 0xff]))).toThrow('ASCII');
    expect(() => decodeContactNfcFrame(new Uint8Array(MAX_CONTACT_NFC_FRAME_BYTES + 1))).toThrow('size');
  });

  test('without the native module NFC reports unsupported and reading fails cleanly', async () => {
    await expect(getContactNfcStatus()).resolves.toBe('unsupported');
    await expect(readContactNfcLink(1_000)).rejects.toMatchObject({ code: 'unavailable' });
  });
});
