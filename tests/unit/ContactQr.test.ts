import { create } from 'qrcode';

import {
  encodeContactLink,
  isContactLinkCandidate,
  MAX_CONTACT_LINK_BYTES,
} from '../../src/services/metevo/contactLink';
import { classifyScannedCode, encodeContactQr } from '../../src/services/metevo/contactQr';

jest.mock('expo-secure-store', () => ({}));

const NODE = `02${'ab'.repeat(32)}`;
const LINK = encodeContactLink({ name: 'Maria', nodePubkey: NODE });

function darkModulesInPath(path: string): number {
  return [...path.matchAll(/h(\d+)v1/g)].reduce((total, [, width]) => total + Number(width), 0);
}

describe('contact QR symbol', () => {
  test('draws exactly the dark modules of the encoded link', () => {
    const symbol = encodeContactQr(LINK);
    const { modules } = create(LINK, { errorCorrectionLevel: 'M' });
    const dark = modules.data.reduce((total, bit) => total + bit, 0);
    expect(symbol.size).toBe(modules.size);
    expect(darkModulesInPath(symbol.path)).toBe(dark);
  });

  test('starts with the top-left finder pattern row', () => {
    expect(encodeContactQr(LINK).path.startsWith('M0 0h7v1h-7z')).toBe(true);
  });

  test('is deterministic for the same link', () => {
    expect(encodeContactQr(LINK)).toEqual(encodeContactQr(LINK));
  });

  test('fits the longest allowed contact link', () => {
    const longest = encodeContactLink({ name: '€'.repeat(42), nodePubkey: NODE });
    expect(longest.length).toBeLessThanOrEqual(MAX_CONTACT_LINK_BYTES);
    expect(encodeContactQr(longest).size).toBeLessThanOrEqual(97);
  });
});

describe('scanned code routing', () => {
  test('sends METEVO contact links to the confirmation card', () => {
    expect(classifyScannedCode(`  ${LINK}\n`)).toEqual({ kind: 'contact-link', link: LINK });
  });

  test('routes malformed METEVO contact links to the card, which explains the error', () => {
    expect(classifyScannedCode('metevo://contact?v=1&name=Maria')).toEqual({
      kind: 'contact-link',
      link: 'metevo://contact?v=1&name=Maria',
    });
  });

  test.each([
    'https://example.com',
    'bitcoin:bc1qexample',
    'lnbc1example',
    'metevo://pay?amount=1',
    'metevo://contacts',
    '',
  ])('treats %p as a foreign code', (data) => {
    expect(classifyScannedCode(data)).toEqual({ kind: 'foreign' });
  });

  test('ignores non-text scanner payloads', () => {
    expect(classifyScannedCode(undefined)).toEqual({ kind: 'foreign' });
    expect(classifyScannedCode(42)).toEqual({ kind: 'foreign' });
  });

  test('bounds oversized payloads before they reach the import queue', () => {
    const oversized = `metevo://contact?v=1&name=${'a'.repeat(5_000)}`;
    const routed = classifyScannedCode(oversized);
    expect(routed.kind).toBe('contact-link');
    expect(routed.kind === 'contact-link' && routed.link.length).toBe(MAX_CONTACT_LINK_BYTES + 1);
  });

  test('shares the deep link prefix filter', () => {
    expect(isContactLinkCandidate('METEVO://CONTACT?v=1')).toBe(true);
    expect(isContactLinkCandidate('metevo://expo-development-client/?url=x')).toBe(false);
  });
});
