import * as SecureStore from 'expo-secure-store';

import { encodeContactLink, normalizeContactName, type SharedContact } from './contactLink';
import { isValidNodePubkey } from './contacts';

function nameKey(nodePubkey: string): string {
  if (!isValidNodePubkey(nodePubkey)) throw new Error('Your wallet node is not ready.');
  return `metevo.contacts.self.${nodePubkey.trim().toLowerCase()}`;
}

/** A local sharing label per node, separate from the payment contact book. */
export async function readOwnContactName(nodePubkey: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(nameKey(nodePubkey));
  if (raw === null) return null;
  try { return normalizeContactName(raw); }
  catch { return null; }
}

export async function saveOwnContact(name: string, nodePubkey: string): Promise<SharedContact> {
  const contact = { name: normalizeContactName(name), nodePubkey: nodePubkey.trim().toLowerCase() };
  encodeContactLink(contact);
  await SecureStore.setItemAsync(nameKey(nodePubkey), contact.name);
  return contact;
}
