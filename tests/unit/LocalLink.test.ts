import {
  FRAME_SIZE,
  decodeLocalLinkFrame,
  encodeLocalLinkFrame,
} from '../../src/services/localelink/localLinkFrame';

describe('local link credential frame (240 bytes)', () => {
  const credentials = {
    ssid: 'DIRECT-metevo-ab12',
    password: 'p2p-passphrase',
    sessionId: 'session-0001',
  };

  test('encodes to exactly 240 bytes starting with the magic', () => {
    const frame = encodeLocalLinkFrame(credentials);
    expect(frame.length).toBe(FRAME_SIZE);
    expect(frame.length).toBe(240);
    expect(Array.from(frame.slice(0, 7))).toEqual(
      Array.from(new TextEncoder().encode('METEVO1')),
    );
  });

  test('decodes back to the original credentials', () => {
    const decoded = decodeLocalLinkFrame(encodeLocalLinkFrame(credentials));
    expect(decoded).toEqual(credentials);
  });

  test('round-trips maximum-length fields without bleeding', () => {
    const maxed = {
      ssid: 'S'.repeat(64),
      password: 'P'.repeat(96),
      sessionId: 'I'.repeat(32),
    };
    expect(decodeLocalLinkFrame(encodeLocalLinkFrame(maxed))).toEqual(maxed);
  });

  test('rejects oversized fields before any bytes are shared', () => {
    expect(() =>
      encodeLocalLinkFrame({ ...credentials, ssid: 'x'.repeat(65) }),
    ).toThrow(/ssid/);
    expect(() =>
      encodeLocalLinkFrame({ ...credentials, password: 'x'.repeat(97) }),
    ).toThrow(/password/);
    expect(() =>
      encodeLocalLinkFrame({ ...credentials, sessionId: 'x'.repeat(33) }),
    ).toThrow(/sessionId/);
  });

  test('decode rejects a frame with a wrong magic', () => {
    const frame = encodeLocalLinkFrame(credentials);
    frame[0] = 0x58; // 'X'
    expect(() => decodeLocalLinkFrame(frame)).toThrow(/magic/);
  });

  test('decode rejects a frame that is too short', () => {
    expect(() => decodeLocalLinkFrame(new Uint8Array(10))).toThrow(/240/);
  });

  test('decoding trims NUL padding, not user spaces', () => {
    const frame = encodeLocalLinkFrame({
      ...credentials,
      ssid: 'DIRECT-metevo',
    });
    expect(decodeLocalLinkFrame(frame).ssid).toBe('DIRECT-metevo');
  });
});
