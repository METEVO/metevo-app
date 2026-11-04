import * as SecureStore from 'expo-secure-store';

import { normalizeContactEmail, normalizeContactPhone } from './contactFields';

/**
 * Local contact book for in-person payment verification.
 *
 * Non-secret metadata only (name, node pubkey, optional phone and email):
 * stored WITHOUT the biometric gate (unlike seeds) but still device-local.
 * The in-person payer flow compares the receiver's node id against this
 * list and shows the known/unknown state before any money moves.
 *
 * People known only by phone or email are kept in a separate pending list:
 * they cannot be paid, so payment lookups never see them.
 */

export interface ContactDetails {
  /** E.164, e.g. +393331234567. */
  phone?: string;
  /** Lowercased. */
  email?: string;
}

export interface StoredContact extends ContactDetails {
  name: string;
  /** Lowercased compressed node pubkey (66 hex chars). */
  nodePubkey: string;
  addedAt: string;
}

/** Someone to ask for a METEVO contact; becomes a StoredContact once their
 * node pubkey arrives through an imported link. */
export interface PendingContact extends ContactDetails {
  id: string;
  name: string;
  addedAt: string;
  /** Last contact request sent through the relay, if any. */
  requestId?: string;
  requestedAt?: string;
}

const CONTACTS_KEY = 'metevo.contacts.index';
const PENDING_CONTACTS_KEY = 'metevo.contacts.pending';

/** Compressed secp256k1 key: the only recipient identity a payment can use. */
const NODE_PUBKEY_PATTERN = /^(02|03)[0-9a-f]{64}$/i;

export function isValidNodePubkey(nodePubkey: string): boolean {
  return NODE_PUBKEY_PATTERN.test(nodePubkey.trim());
}

function normalizePubkey(nodePubkey: string): string {
  return nodePubkey.trim().toLowerCase();
}

function normalizeDetails(details: ContactDetails = {}): ContactDetails {
  const phone = details.phone?.trim() ? normalizeContactPhone(details.phone) : undefined;
  const email = details.email?.trim() ? normalizeContactEmail(details.email) : undefined;
  return {
    ...(phone === undefined ? {} : { phone }),
    ...(email === undefined ? {} : { email }),
  };
}

function sharesDetail(entry: ContactDetails, details: ContactDetails): boolean {
  return (
    (details.phone !== undefined && entry.phone === details.phone) ||
    (details.email !== undefined && entry.email === details.email)
  );
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

async function readList<T>(key: string, isEntry: (entry: Record<string, unknown>) => boolean): Promise<T[]> {
  const raw = await SecureStore.getItemAsync(key);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry) => typeof entry === 'object' && entry !== null && isEntry(entry),
    ) as T[];
  } catch {
    return [];
  }
}

function readIndex(): Promise<StoredContact[]> {
  return readList<StoredContact>(
    CONTACTS_KEY,
    (entry) =>
      typeof entry.name === 'string' &&
      typeof entry.nodePubkey === 'string' &&
      isOptionalString(entry.phone) &&
      isOptionalString(entry.email),
  );
}

function readPending(): Promise<PendingContact[]> {
  return readList<PendingContact>(
    PENDING_CONTACTS_KEY,
    (entry) =>
      typeof entry.id === 'string' &&
      typeof entry.name === 'string' &&
      isOptionalString(entry.phone) &&
      isOptionalString(entry.email),
  );
}

export async function listContacts(): Promise<StoredContact[]> {
  return readIndex();
}

export async function listPendingContacts(): Promise<PendingContact[]> {
  return readPending();
}

/** Adds (or refreshes) a contact; idempotent per node pubkey. Details that
 * are not passed keep their saved values. A pending contact with the same
 * phone or email is completed: it leaves the pending list. */
export async function rememberContact(
  name: string,
  nodePubkey: string,
  details?: ContactDetails,
): Promise<StoredContact> {
  const pubkey = normalizePubkey(nodePubkey);
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error('contact name is required');
  }
  if (!isValidNodePubkey(pubkey)) {
    throw new Error('contact node pubkey is invalid');
  }
  const normalizedDetails = details === undefined ? undefined : normalizeDetails(details);
  const [contacts, pending] = await Promise.all([readIndex(), readPending()]);
  const existing = contacts.findIndex((entry) => entry.nodePubkey === pubkey);
  const savedDetails: ContactDetails = normalizedDetails ?? {
    ...(existing >= 0 && contacts[existing].phone !== undefined ? { phone: contacts[existing].phone } : {}),
    ...(existing >= 0 && contacts[existing].email !== undefined ? { email: contacts[existing].email } : {}),
  };
  const completed = pending.filter((entry) => sharesDetail(entry, savedDetails));
  // A spoken name must resolve to exactly one node, so two contacts cannot
  // share a name: otherwise "send to Alice" could pay the wrong node.
  const clash =
    contacts.some((entry) => entry.nodePubkey !== pubkey && sameName(entry.name, trimmedName)) ||
    pending.some((entry) => !completed.includes(entry) && sameName(entry.name, trimmedName));
  if (clash) {
    throw new Error('another contact already uses that name');
  }
  const entry: StoredContact = {
    name: trimmedName,
    nodePubkey: pubkey,
    ...savedDetails,
    addedAt: existing >= 0 ? contacts[existing].addedAt : new Date().toISOString(),
  };
  if (existing >= 0) {
    contacts[existing] = entry;
  } else {
    contacts.push(entry);
  }
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts));
  if (completed.length > 0) {
    await SecureStore.setItemAsync(
      PENDING_CONTACTS_KEY,
      JSON.stringify(pending.filter((candidate) => !completed.includes(candidate))),
    );
  }
  return entry;
}

/** Saves someone known only by phone or email. They cannot be paid until
 * their METEVO contact arrives and completes the entry. */
export async function rememberPendingContact(name: string, details: ContactDetails): Promise<PendingContact> {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error('contact name is required');
  }
  const normalizedDetails = normalizeDetails(details);
  if (normalizedDetails.phone === undefined && normalizedDetails.email === undefined) {
    throw new Error('a phone number or an email is required');
  }
  const [contacts, pending] = await Promise.all([readIndex(), readPending()]);
  if ([...contacts, ...pending].some((entry) => sameName(entry.name, trimmedName))) {
    throw new Error('another contact already uses that name');
  }
  if ([...contacts, ...pending].some((entry) => sharesDetail(entry, normalizedDetails))) {
    throw new Error('another contact already uses that phone or email');
  }
  const entry: PendingContact = {
    id: `pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    ...normalizedDetails,
    addedAt: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(PENDING_CONTACTS_KEY, JSON.stringify([...pending, entry]));
  return entry;
}

export async function markPendingContactRequested(id: string, requestId: string): Promise<PendingContact> {
  const pending = await readPending();
  const index = pending.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new Error('pending contact not found');
  }
  pending[index] = { ...pending[index], requestId, requestedAt: new Date().toISOString() };
  await SecureStore.setItemAsync(PENDING_CONTACTS_KEY, JSON.stringify(pending));
  return pending[index];
}

export async function forgetPendingContact(id: string): Promise<void> {
  const pending = await readPending();
  await SecureStore.setItemAsync(
    PENDING_CONTACTS_KEY,
    JSON.stringify(pending.filter((entry) => entry.id !== id)),
  );
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

