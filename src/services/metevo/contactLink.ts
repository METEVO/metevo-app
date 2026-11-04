import { isValidNodePubkey } from './contacts';

/** Public metadata only. addedAt is assigned locally, never imported. */
export interface SharedContact {
  name: string;
  nodePubkey: string;
}

export const MAX_CONTACT_NAME_CHARACTERS = 64;
export const MAX_CONTACT_NAME_BYTES = 128;
/** Payload budget, not a promise about the capacity of any NFC tag. */
export const MAX_CONTACT_LINK_BYTES = 512;

export type ContactLinkErrorCode =
  | 'malformed'
  | 'unsupported-version'
  | 'invalid-name'
  | 'invalid-node'
  | 'too-long';

export class ContactLinkError extends Error {
  constructor(public readonly code: ContactLinkErrorCode, message: string) {
    super(message);
    this.name = 'ContactLinkError';
  }
}

/** Small bounded strings only; no dependency on a TextEncoder polyfill in Hermes. */
function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function normalizeContactName(name: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (
    trimmed.length === 0 ||
    [...trimmed].length > MAX_CONTACT_NAME_CHARACTERS ||
    utf8ByteLength(trimmed) > MAX_CONTACT_NAME_BYTES ||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(name)
  ) {
    throw new ContactLinkError(
      'invalid-name',
      'Enter a name of up to 64 characters (128 UTF-8 bytes), without control characters.',
    );
  }
  // encodeURIComponent rejects unpaired surrogates instead of replacing them.
  try {
    encodeURIComponent(trimmed);
  } catch {
    throw new ContactLinkError('invalid-name', 'The contact name contains invalid characters.');
  }
  return trimmed;
}

export function encodeContactLink(contact: SharedContact): string {
  const name = normalizeContactName(contact.name);
  if (typeof contact.nodePubkey !== 'string' || !isValidNodePubkey(contact.nodePubkey)) {
    throw new ContactLinkError('invalid-node', 'The contact node pubkey is invalid.');
  }
  const node = contact.nodePubkey.trim().toLowerCase();
  const link = `metevo://contact?v=1&name=${encodeURIComponent(name)}&node=${node}`;
  if (utf8ByteLength(link) > MAX_CONTACT_LINK_BYTES) {
    throw new ContactLinkError('too-long', 'The contact link is too long.');
  }
  return link;
}

function decodeField(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    throw new ContactLinkError('malformed', 'The contact link has invalid text encoding.');
  }
}

/** Cheap transport filter: development-client URLs and future app routes share
 * the scheme, but only this prefix is a contact import request. Content after
 * the prefix is validated by decodeContactLink, inside the confirmation card. */
export function isContactLinkCandidate(input: string): boolean {
  return typeof input === 'string' && /^metevo:\/\/contact(?:[/?#]|$)/i.test(input.trim());
}

/** Strict v1 parser shared by deep links and future QR/NFC transports.
 * Does not rely on platform-specific URL implementations or touch storage. */
export function decodeContactLink(input: string): SharedContact {
  if (typeof input !== 'string') {
    throw new ContactLinkError('malformed', 'This is not a METEVO contact link.');
  }
  if (input.length > MAX_CONTACT_LINK_BYTES || utf8ByteLength(input) > MAX_CONTACT_LINK_BYTES) {
    throw new ContactLinkError('too-long', 'The contact link is too long.');
  }
  const match = /^metevo:\/\/contact\?([^#]+)$/i.exec(input.trim());
  if (match === null) {
    throw new ContactLinkError('malformed', 'This is not a METEVO contact link.');
  }
  const fields = new Map<string, string>();
  for (const part of match[1].split('&')) {
    const separator = part.indexOf('=');
    if (separator < 1) {
      throw new ContactLinkError('malformed', 'The contact link has a missing field.');
    }
    const key = decodeField(part.slice(0, separator));
    if (!['v', 'name', 'node'].includes(key) || fields.has(key)) {
      throw new ContactLinkError('malformed', 'The contact link has unsupported or repeated fields.');
    }
    fields.set(key, decodeField(part.slice(separator + 1)));
  }
  if (!fields.has('v') || !fields.has('name') || !fields.has('node')) {
    throw new ContactLinkError('malformed', 'The contact link is missing its version, name or node.');
  }
  if (fields.get('v') !== '1') {
    throw new ContactLinkError('unsupported-version', 'This contact link needs a different METEVO version.');
  }
  const name = normalizeContactName(fields.get('name')!);
  const nodePubkey = fields.get('node')!.trim().toLowerCase();
  if (!isValidNodePubkey(nodePubkey)) {
    throw new ContactLinkError('invalid-node', 'The contact node pubkey is invalid.');
  }
  return { name, nodePubkey };
}
