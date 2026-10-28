import {
  decodeContactLink,
  encodeContactLink,
  MAX_CONTACT_LINK_BYTES,
  normalizeContactName,
  type SharedContact,
} from './contactLink';
import type { StoredContact } from './contacts';

export type ContactImportStage =
  | 'loading' | 'review' | 'saving' | 'saved' | 'duplicate' | 'invalid' | 'load-error';

interface QueuedContact {
  id: number;
  key: string;
  contact: SharedContact | null;
  error: string | null;
}

export interface ContactImportReview extends QueuedContact {
  stage: ContactImportStage;
  name: string;
  existingName: string | null;
}

export interface ContactImportSnapshot {
  active: ContactImportReview | null;
  pendingCount: number;
  overflowed: boolean;
}

interface ContactImportStore {
  listContacts(): Promise<StoredContact[]>;
  rememberContact(name: string, nodePubkey: string): Promise<StoredContact>;
}

export const MAX_PENDING_CONTACT_LINKS = 5;
const NAME_CONFLICT = 'That name is already used. Choose a different name.';

/** Session-local import state, independent of card mount/unmount and wallet
 * connectivity. Every transport enqueues; only explicit confirm() persists. */
export class ContactImportController {
  private queue: QueuedContact[] = [];
  private listeners = new Set<() => void>();
  private serial = 0;
  private recentlyClosed = new Map<string, number>();
  private snapshot: ContactImportSnapshot = { active: null, pendingCount: 0, overflowed: false };

  constructor(private readonly store: ContactImportStore, private readonly now = Date.now) {}

  getSnapshot = (): ContactImportSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(active = this.snapshot.active, overflowed = this.snapshot.overflowed): void {
    this.snapshot = { active, pendingCount: this.queue.length, overflowed };
    this.listeners.forEach((listener) => listener());
  }

  enqueue = (link: string): boolean => {
    let contact: SharedContact | null = null;
    let error: string | null = null;
    // Bound even malformed data retained for deduplication.
    let key = link.slice(0, MAX_CONTACT_LINK_BYTES + 1).trim();
    try {
      contact = decodeContactLink(link);
      key = encodeContactLink(contact);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The contact link is invalid.';
    }
    const now = this.now();
    for (const [closedKey, time] of this.recentlyClosed) {
      if (now - time >= 2_000) this.recentlyClosed.delete(closedKey);
    }
    if (
      this.snapshot.active?.key === key || this.queue.some((entry) => entry.key === key) ||
      this.recentlyClosed.has(key)
    ) return false;
    if (this.queue.length >= MAX_PENDING_CONTACT_LINKS) {
      this.publish(this.snapshot.active, true);
      return false;
    }
    this.queue.push({ id: ++this.serial, key, contact, error });
    this.publish();
    return true;
  };

  /** The shell is the arbiter: false while connecting, offline or busy. */
  openNext = (canOpen: boolean): boolean => {
    if (!canOpen) return false;
    if (this.snapshot.active !== null) return true;
    const entry = this.queue.shift();
    if (entry === undefined) return false;
    this.publish({
      ...entry,
      name: entry.contact?.name ?? '',
      existingName: null,
      stage: entry.contact === null ? 'invalid' : 'loading',
    });
    if (entry.contact !== null) void this.prepare(entry.id);
    return true;
  };

  private async prepare(id: number): Promise<void> {
    try {
      const contacts = await this.store.listContacts();
      const active = this.snapshot.active;
      if (active?.id !== id || active.contact === null) return;
      const existing = contacts.find((entry) => entry.nodePubkey.toLowerCase() === active.contact!.nodePubkey);
      this.publish({
        ...active,
        stage: existing ? 'duplicate' : 'review',
        existingName: existing?.name ?? null,
        error: existing ? null : this.nameConflict(contacts, active.name),
      });
    } catch {
      const active = this.snapshot.active;
      if (active?.id === id) {
        this.publish({ ...active, stage: 'load-error', error: 'Your contacts could not be loaded. Try again.' });
      }
    }
  }

  retry = (): void => {
    const active = this.snapshot.active;
    if (active?.stage !== 'load-error') return;
    this.publish({ ...active, stage: 'loading', error: null });
    void this.prepare(active.id);
  };

  setName = (name: string): void => {
    const active = this.snapshot.active;
    if (active?.stage === 'review') this.publish({ ...active, name, error: null });
  };

  private nameConflict(contacts: StoredContact[], name: string): string | null {
    return contacts.some((entry) => entry.name.trim().toLowerCase() === name.trim().toLowerCase())
      ? NAME_CONFLICT : null;
  }

  confirm = async (): Promise<void> => {
    const active = this.snapshot.active;
    if (active?.stage !== 'review' || active.contact === null) return;
    let name: string;
    try {
      name = normalizeContactName(active.name);
    } catch (cause) {
      this.publish({ ...active, error: cause instanceof Error ? cause.message : 'Enter a valid name.' });
      return;
    }
    // Synchronous transition guards two taps before React has re-rendered.
    this.publish({ ...active, name, stage: 'saving', error: null });
    try {
      const contacts = await this.store.listContacts();
      const existing = contacts.find((entry) => entry.nodePubkey.toLowerCase() === active.contact!.nodePubkey);
      if (existing) {
        this.publish({ ...active, name, stage: 'duplicate', existingName: existing.name, error: null });
        return;
      }
      const conflict = this.nameConflict(contacts, name);
      if (conflict !== null) {
        this.publish({ ...active, name, stage: 'review', error: conflict });
        return;
      }
      await this.store.rememberContact(name, active.contact.nodePubkey);
      this.publish({ ...active, name, stage: 'saved', error: null });
    } catch (cause) {
      this.publish({
        ...active, name, stage: 'review',
        error: cause instanceof Error && cause.message === 'another contact already uses that name'
          ? NAME_CONFLICT : 'The contact could not be saved. Try again.',
      });
    }
  };

  close = (): boolean => {
    const active = this.snapshot.active;
    if (active?.stage === 'saving') return false;
    if (active !== null) {
      this.recentlyClosed.set(active.key, this.now());
      // At most a small session-local deduplication window is retained.
      if (this.recentlyClosed.size > 32) this.recentlyClosed.delete(this.recentlyClosed.keys().next().value!);
    }
    this.publish(null, this.queue.length > 0 && this.snapshot.overflowed);
    return true;
  };
}
