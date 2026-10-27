import * as SecureStore from 'expo-secure-store';

/**
 * Local contact book for in-person payment verification.
 *
 * Non-secret metadata only (name + node pubkey): stored WITHOUT the
 * biometric gate (unlike seeds) but still device-local. The in-person
 * payer flow compares the receiver's node id against this list and shows
 * the known/unknown state before any money moves.
 */

export interface StoredContact {
  name: string;
  /** Lowercased compressed node pubkey (66 hex chars). */
  nodePubkey: string;
  addedAt: string;
}

const CONTACTS_KEY = 'metevo.contacts.index';

/** Compressed secp256k1 key: the only recipient identity a payment can use. */
const NODE_PUBKEY_PATTERN = /^(02|03)[0-9a-f]{64}$/i;

export function isValidNodePubkey(nodePubkey: string): boolean {
  return NODE_PUBKEY_PATTERN.test(nodePubkey.trim());
}

function normalizePubkey(nodePubkey: string): string {
  return nodePubkey.trim().toLowerCase();
}

async function readIndex(): Promise<StoredContact[]> {
  const raw = await SecureStore.getItemAsync(CONTACTS_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is StoredContact =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as StoredContact).name === 'string' &&
        typeof (entry as StoredContact).nodePubkey === 'string',
    );
  } catch {
    return [];
  }
}

export async function listContacts(): Promise<StoredContact[]> {
  return readIndex();
}

/** Adds (or refreshes) a contact; idempotent per node pubkey. */
export async function rememberContact(name: string, nodePubkey: string): Promise<StoredContact> {
  const pubkey = normalizePubkey(nodePubkey);
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error('contact name is required');
  }
  if (!isValidNodePubkey(pubkey)) {
    throw new Error('contact node pubkey is invalid');
  }
  const contacts = await readIndex();
  const existing = contacts.findIndex((entry) => entry.nodePubkey === pubkey);
  const entry: StoredContact = {
    name: trimmedName,
    nodePubkey: pubkey,
    addedAt: existing >= 0 ? contacts[existing].addedAt : new Date().toISOString(),
  };
  if (existing >= 0) {
    contacts[existing] = entry;
  } else {
    contacts.push(entry);
  }
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts));
  return entry;
}

export async function isKnownContact(nodePubkey: string): Promise<boolean> {
  const pubkey = normalizePubkey(nodePubkey);
  const contacts = await readIndex();
  return contacts.some((entry) => entry.nodePubkey === pubkey);
}

/** The contact whose label matches the spoken recipient (case-insensitive). */
export async function findContactByName(name: string): Promise<StoredContact | null> {
  const needle = name.trim().toLowerCase();
  if (needle.length === 0) {
    return null;
  }
  const contacts = await readIndex();
  return contacts.find((entry) => entry.name.trim().toLowerCase() === needle) ?? null;
}

/** The contact that owns a node pubkey, used to name an incoming request. */
export async function findContactByPubkey(nodePubkey: string): Promise<StoredContact | null> {
  const pubkey = normalizePubkey(nodePubkey);
  const contacts = await readIndex();
  return contacts.find((entry) => entry.nodePubkey === pubkey) ?? null;
}

export async function forgetContact(nodePubkey: string): Promise<void> {
  const pubkey = normalizePubkey(nodePubkey);
  const contacts = await readIndex();
  const remaining = contacts.filter((entry) => entry.nodePubkey !== pubkey);
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(remaining));
}

