/** Field rules shared by the contact link codec and the contact store, kept
 * free of imports so neither module depends on the other through it. */

export const MAX_CONTACT_EMAIL_CHARACTERS = 254;

export type ContactLinkErrorCode =
  | 'malformed'
  | 'unsupported-version'
  | 'invalid-name'
  | 'invalid-node'
  | 'invalid-phone'
  | 'invalid-email'
  | 'too-long';

export class ContactLinkError extends Error {
  constructor(public readonly code: ContactLinkErrorCode, message: string) {
    super(message);
    this.name = 'ContactLinkError';
  }
}

/** E.164: a leading + and the country code make a number unambiguous across
 * phones; spaces, dots, dashes and brackets are accepted while typing. */
export function normalizeContactPhone(phone: string): string {
  const compact = typeof phone === 'string' ? phone.replace(/[\s.()-]/g, '') : '';
  if (!/^\+[1-9]\d{6,14}$/.test(compact)) {
    throw new ContactLinkError(
      'invalid-phone',
      'Enter the phone number with its country code, for example +39 333 123 4567.',
    );
  }
  return compact;
}

export function normalizeContactEmail(email: string): string {
  const trimmed = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (
    trimmed.length > MAX_CONTACT_EMAIL_CHARACTERS ||
    !/^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\]+$/.test(trimmed)
  ) {
    throw new ContactLinkError('invalid-email', 'Enter a valid email address, for example maria@example.com.');
  }
  return trimmed;
}
