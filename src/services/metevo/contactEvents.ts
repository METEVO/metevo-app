/**
 * Test-trail events for contact sharing, readable with
 * `adb logcat -s ReactNativeJS | grep "[metevo][contacts]"`.
 *
 * Only these fixed labels can be logged: names, phone numbers, emails, node
 * pubkeys and links never reach the device log.
 */
export type ContactEvent =
  | 'qr:shown-own'
  | 'qr:shown-contact'
  | 'scan:opened'
  | 'scan:permission-denied'
  | 'scan:foreign-code'
  | 'scan:contact-link'
  | 'scan:not-queued'
  | 'import:queued'
  | 'import:not-queued'
  | 'import:invalid'
  | 'import:review'
  | 'import:review-completes-pending'
  | 'import:name-conflict'
  | 'import:duplicate'
  | 'import:saved'
  | 'import:save-failed'
  | 'import:load-error'
  | 'import:closed'
  | 'own:saved'
  | 'own:saved-with-phone-or-email'
  | 'contact:saved'
  | 'contact:saved-pending'
  | 'request:sent'
  | 'request:unavailable'
  | 'request:failed'
  | 'request:pending'
  | 'request:answered'
  | 'request:declined'
  | 'request:expired';

export function logContactEvent(event: ContactEvent): void {
  console.log(`[metevo][contacts] ${event}`);
}
