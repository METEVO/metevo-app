import * as SecureStore from 'expo-secure-store';

import { encodeContactLink, normalizeContactName, normalizeSharedContact, type SharedContact } from './contactLink';
import { isValidNodePubkey, type ContactDetails } from './contacts';

function nameKey(nodePubkey: string): string {
  if (!isValidNodePubkey(nodePubkey)) throw new Error('Your wallet node is not ready.');
  return `metevo.contacts.self.${nodePubkey.trim().toLowerCase()}`;
}

function detailsKey(nodePubkey: string): string {
  return `${nameKey(nodePubkey)}.details`;
}

/** A local sharing label per node, separate from the payment contact book. */
export async function readOwnContactName(nodePubkey: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(nameKey(nodePubkey));
  if (raw === null) return null;
  try { return normalizeContactName(raw); }
  catch { return null; }
}

/** Phone and email the user chose to share; corrupt entries share nothing. */
export async function readOwnContactDetails(nodePubkey: string): Promise<ContactDetails> {
  const raw = await SecureStore.getItemAsync(detailsKey(nodePubkey));
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as ContactDetails;
    const { phone, email } = normalizeSharedContact({ name: 'self', nodePubkey, ...parsed });
    return { ...(phone === undefined ? {} : { phone }), ...(email === undefined ? {} : { email }) };
  } catch {
    return {};
  }
}

export async function saveOwnContact(
  name: string,
  nodePubkey: string,
  details: ContactDetails = {},
): Promise<SharedContact> {
  const contact = normalizeSharedContact({ name, nodePubkey, ...details });
  encodeContactLink(contact);
  await SecureStore.setItemAsync(nameKey(nodePubkey), contact.name);
  await SecureStore.setItemAsync(
    detailsKey(nodePubkey),
    JSON.stringify({ phone: contact.phone, email: contact.email }),
  );
  return contact;
}
