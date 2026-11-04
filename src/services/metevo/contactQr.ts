import { create } from 'qrcode';

import { isContactLinkCandidate, MAX_CONTACT_LINK_BYTES } from './contactLink';

/** Blank border the ISO 18004 spec requires around the symbol for scanners. */
export const QR_QUIET_ZONE_MODULES = 4;

export interface ContactQrSymbol {
  /** Modules per side, without the quiet zone. */
  size: number;
  /** One SVG path drawing every dark module, in module units. */
  path: string;
}

/** Medium error correction keeps a v1 link (at most 512 bytes) scannable from
 * a phone screen while leaving room for glare and partial occlusion. */
export function encodeContactQr(link: string): ContactQrSymbol {
  const { modules } = create(link, { errorCorrectionLevel: 'M' });
  const runs: string[] = [];
  for (let row = 0; row < modules.size; row += 1) {
    let column = 0;
    while (column < modules.size) {
      if (!modules.get(row, column)) {
        column += 1;
        continue;
      }
      const start = column;
      while (column < modules.size && modules.get(row, column)) column += 1;
      runs.push(`M${start} ${row}h${column - start}v1h${start - column}z`);
    }
  }
  return { size: modules.size, path: runs.join('') };
}

export type ScannedCode =
  | { kind: 'contact-link'; link: string }
  | { kind: 'foreign' };

/** Only the routing decision lives here: every METEVO contact link, valid or
 * not, goes to the same confirmation card used by deep links. */
export function classifyScannedCode(data: unknown): ScannedCode {
  if (typeof data !== 'string' || !isContactLinkCandidate(data)) return { kind: 'foreign' };
  return { kind: 'contact-link', link: data.trim().slice(0, MAX_CONTACT_LINK_BYTES + 1) };
}
