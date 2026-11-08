import * as SecureStore from 'expo-secure-store';

import { decodeContactLink, encodeContactLink } from './contactLink';
import type { ContactEvent } from './contactEvents';
import { MAX_PENDING_CONTACT_LINKS, type ContactImportController } from './contactImport';

/** Links waiting for the user's decision, kept across app restarts: Android
 * may close the app while the wallet is still connecting. */
const IMPORT_QUEUE_KEY = 'metevo.contacts.importQueue';

/** Active card plus the queue: never more than this many links. */
const MAX_SAVED_LINKS = MAX_PENDING_CONTACT_LINKS + 1;

/** Only canonical, still-valid links come back; anything else is dropped. */
export async function readSavedImportLinks(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(IMPORT_QUEUE_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_SAVED_LINKS).flatMap((link) => {
      if (typeof link !== 'string') return [];
      try { return [encodeContactLink(decodeContactLink(link))]; }
      catch { return []; }
    });
  } catch {
    return [];
  }
}

export async function saveImportLinks(links: string[]): Promise<void> {
  const kept = links.slice(0, MAX_SAVED_LINKS);
  if (kept.length === 0) {
    await SecureStore.deleteItemAsync(IMPORT_QUEUE_KEY);
    return;
  }
  await SecureStore.setItemAsync(IMPORT_QUEUE_KEY, JSON.stringify(kept));
}

interface ImportQueueStorage {
  read(): Promise<string[]>;
  save(links: string[]): Promise<void>;
}

const secureStorage: ImportQueueStorage = { read: readSavedImportLinks, save: saveImportLinks };

/** Restores saved links into the controller, then mirrors every change of the
 * undecided links to storage. Saving starts only after the restore, so an
 * early deep link cannot wipe links saved by the previous session. */
export function keepImportQueue(
  controller: Pick<ContactImportController, 'enqueue' | 'subscribe' | 'undecidedLinks'>,
  log: (event: ContactEvent) => void = () => undefined,
  storage: ImportQueueStorage = secureStorage,
): () => void {
  let active = true;
  let restored = false;
  let lastSaved: string | null = null;
  const persist = () => {
    if (!active || !restored) return;
    const links = controller.undecidedLinks();
    const serialized = JSON.stringify(links);
    if (serialized === lastSaved) return;
    lastSaved = serialized;
    void storage.save(links).catch(() => {
      // Losing the saved copy only means a link must be opened again.
      lastSaved = null;
    });
  };
  const unsubscribe = controller.subscribe(persist);
  void storage.read()
    .then((links) => {
      if (!active) return;
      links.forEach((link) => { if (controller.enqueue(link)) log('import:restored'); });
    })
    .catch(() => undefined)
    .finally(() => {
      restored = true;
      persist();
    });
  return () => {
    active = false;
    unsubscribe();
  };
}
