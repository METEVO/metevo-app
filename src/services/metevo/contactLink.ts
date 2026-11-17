import {
  ContactLinkError,
  normalizeContactEmail,
  normalizeContactPhone,
} from './contactFields';
import { isValidNodePubkey } from './contacts';

export {
  ContactLinkError,
  MAX_CONTACT_EMAIL_CHARACTERS,
  normalizeContactEmail,
  normalizeContactPhone,
  type ContactLinkErrorCode,
} from './contactFields';

/** Public metadata only. addedAt is assigned locally, never imported.
 * Phone and email are optional: they let a contact be recognised and asked
 * for a contact through the relay, but never address a payment. */
export interface SharedContact {
  name: string;
  nodePubkey: string;
  phone?: string;
  email?: string;
}

export const MAX_CONTACT_NAME_CHARACTERS = 64;
export const MAX_CONTACT_NAME_BYTES = 128;
/** Payload budget, not a promise about the capacity of any NFC tag. v2 links
 * carry phone and email, and still fit a QR code readable from a screen. */
export const MAX_CONTACT_LINK_BYTES = 1024;

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

/** Blank optional fields mean "not shared", so they are dropped, not rejected. */
function optionalField(value: string | undefined, normalize: (raw: string) => string): string | undefined {
  if (value === undefined || value.trim().length === 0) return undefined;
  return normalize(value);
}

export function normalizeSharedContact(contact: SharedContact): SharedContact {
  const name = normalizeContactName(contact.name);
  if (typeof contact.nodePubkey !== 'string' || !isValidNodePubkey(contact.nodePubkey)) {
    throw new ContactLinkError('invalid-node', 'The contact node pubkey is invalid.');
  }
  const phone = optionalField(contact.phone, normalizeContactPhone);
  const email = optionalField(contact.email, normalizeContactEmail);
  return {
    name,
    nodePubkey: contact.nodePubkey.trim().toLowerCase(),
    ...(phone === undefined ? {} : { phone }),
    ...(email === undefined ? {} : { email }),
  };
}

/** v1 stays the encoding of a name + node contact, so older builds keep
 * reading it; v2 is used only when phone or email is shared. */
export function encodeContactLink(contact: SharedContact): string {
  const { name, nodePubkey, phone, email } = normalizeSharedContact(contact);
  const extras = [
    phone === undefined ? '' : `&phone=${encodeURIComponent(phone)}`,
    email === undefined ? '' : `&email=${encodeURIComponent(email)}`,
  ].join('');
  const version = extras.length === 0 ? 1 : 2;
  const link = `metevo://contact?v=${version}&name=${encodeURIComponent(name)}&node=${nodePubkey}${extras}`;
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

/** Strict v1/v2 parser shared by deep links, QR and future NFC transports.
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
    if (!['v', 'name', 'node', 'phone', 'email'].includes(key) || fields.has(key)) {
      throw new ContactLinkError('malformed', 'The contact link has unsupported or repeated fields.');
    }
    fields.set(key, decodeField(part.slice(separator + 1)));
  }
  if (!fields.has('v') || !fields.has('name') || !fields.has('node')) {
    throw new ContactLinkError('malformed', 'The contact link is missing its version, name or node.');
  }
  const version = fields.get('v');
  if (version !== '1' && version !== '2') {
    throw new ContactLinkError('unsupported-version', 'This contact link needs a different METEVO version.');
  }
  if (version === '1' && (fields.has('phone') || fields.has('email'))) {
    throw new ContactLinkError('malformed', 'The contact link has unsupported or repeated fields.');
  }
  if (!isValidNodePubkey(fields.get('node')!.trim())) {
    throw new ContactLinkError('invalid-node', 'The contact node pubkey is invalid.');
  }
  return normalizeSharedContact({
    name: fields.get('name')!,
    nodePubkey: fields.get('node')!,
    phone: fields.get('phone'),
    email: fields.get('email'),
  });
}

/** Text for the system share sheet. Chat apps often show metevo:// links as
 * plain text, so the message also says how to import a copied link. */
export function contactShareMessage(contact: SharedContact): string {
  const link = encodeContactLink(contact);
  const name = normalizeContactName(contact.name);
  return [
    `Add ${name} to your METEVO contacts: tap the link below.`,
    'If it does not open, copy it and choose Contacts > Paste a contact link in METEVO.',
    '',
    link,
  ].join('\n');
}
