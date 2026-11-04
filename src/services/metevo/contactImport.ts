import {
  decodeContactLink,
  encodeContactLink,
  MAX_CONTACT_LINK_BYTES,
  normalizeContactName,
  type SharedContact,
} from './contactLink';
import type { ContactEvent } from './contactEvents';
import type { ContactDetails, PendingContact, StoredContact } from './contacts';

export type ContactImportStage =
  | 'loading' | 'review' | 'saving' | 'saved' | 'duplicate' | 'updated' | 'invalid' | 'load-error';

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
  /** Local name of the pending contact this link completes, if any. */
  pendingName: string | null;
  /** On a duplicate: phone or email in the link that differ from the saved
   * ones. Offered as an update; the local name never changes by itself. */
  detailUpdate: ContactDetails | null;
}

export interface ContactImportSnapshot {
  active: ContactImportReview | null;
  pendingCount: number;
  overflowed: boolean;
}

interface ContactImportStore {
  listContacts(): Promise<StoredContact[]>;
  listPendingContacts?(): Promise<PendingContact[]>;
  rememberContact(name: string, nodePubkey: string, details?: ContactDetails): Promise<StoredContact>;
}

interface ContactBook {
  contacts: StoredContact[];
  pending: PendingContact[];
}

function matchingPending(pending: PendingContact[], contact: SharedContact): PendingContact | null {
  return pending.find((entry) =>
    (contact.phone !== undefined && entry.phone === contact.phone) ||
    (contact.email !== undefined && entry.email === contact.email)) ?? null;
}

function changedDetails(saved: ContactDetails, contact: SharedContact): ContactDetails | null {
  const update: ContactDetails = {
    ...(contact.phone !== undefined && contact.phone !== saved.phone ? { phone: contact.phone } : {}),
    ...(contact.email !== undefined && contact.email !== saved.email ? { email: contact.email } : {}),
  };
  return update.phone === undefined && update.email === undefined ? null : update;
}

/** Stages where the link still waits for the user's decision. */
const UNDECIDED_STAGES: readonly ContactImportStage[] = ['loading', 'review', 'saving', 'load-error'];

function sharedDetails(contact: SharedContact): ContactDetails {
  return {
    ...(contact.phone === undefined ? {} : { phone: contact.phone }),
    ...(contact.email === undefined ? {} : { email: contact.email }),
  };
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

  constructor(
    private readonly store: ContactImportStore,
    private readonly now = Date.now,
    private readonly log: (event: ContactEvent) => void = () => undefined,
  ) {}

  getSnapshot = (): ContactImportSnapshot => this.snapshot;

  /** Valid links still waiting for a decision, oldest first: what must
   * survive the app being closed. Malformed links are not kept. */
  undecidedLinks = (): string[] => {
    const active = this.snapshot.active;
    const activeLink = active !== null && active.contact !== null && UNDECIDED_STAGES.includes(active.stage)
      ? [active.key] : [];
    return [...activeLink, ...this.queue.filter((entry) => entry.contact !== null).map((entry) => entry.key)];
  };

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
    ) {
      this.log('import:not-queued');
      return false;
    }
    if (this.queue.length >= MAX_PENDING_CONTACT_LINKS) {
      this.log('import:not-queued');
      this.publish(this.snapshot.active, true);
      return false;
    }
    this.queue.push({ id: ++this.serial, key, contact, error });
    this.log(contact === null ? 'import:invalid' : 'import:queued');
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
      pendingName: null,
      detailUpdate: null,
      stage: entry.contact === null ? 'invalid' : 'loading',
    });
    if (entry.contact !== null) void this.prepare(entry.id);
    return true;
  };

  private async readBook(): Promise<ContactBook> {
    const [contacts, pending] = await Promise.all([
      this.store.listContacts(),
      this.store.listPendingContacts?.() ?? Promise.resolve([]),
    ]);
    return { contacts, pending };
  }

  private async prepare(id: number): Promise<void> {
    try {
      const book = await this.readBook();
      const active = this.snapshot.active;
      if (active?.id !== id || active.contact === null) return;
      const existing = book.contacts.find((entry) => entry.nodePubkey.toLowerCase() === active.contact!.nodePubkey);
      const pending = existing ? null : matchingPending(book.pending, active.contact);
      // The name chosen when asking for the contact is the user's own label.
      const name = pending?.name ?? active.name;
      const conflict = existing ? null : this.nameConflict(book, active.contact, name);
      const detailUpdate = existing ? changedDetails(existing, active.contact) : null;
      this.log(existing ? (detailUpdate ? 'import:duplicate-with-new-details' : 'import:duplicate')
        : conflict !== null ? 'import:name-conflict'
          : pending ? 'import:review-completes-pending' : 'import:review');
      this.publish({
        ...active,
        name,
        stage: existing ? 'duplicate' : 'review',
        existingName: existing?.name ?? null,
        pendingName: pending?.name ?? null,
        detailUpdate,
        error: conflict,
      });
    } catch {
      const active = this.snapshot.active;
      if (active?.id === id) {
        this.log('import:load-error');
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

  /** The pending entry this link completes is replaced, so its name is free. */
  private nameConflict(book: ContactBook, contact: SharedContact, name: string): string | null {
    const completed = matchingPending(book.pending, contact);
    const sameName = (entry: { name: string }) => entry.name.trim().toLowerCase() === name.trim().toLowerCase();
    return book.contacts.some(sameName) || book.pending.some((entry) => entry !== completed && sameName(entry))
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
      const book = await this.readBook();
      const existing = book.contacts.find((entry) => entry.nodePubkey.toLowerCase() === active.contact!.nodePubkey);
      if (existing) {
        const detailUpdate = changedDetails(existing, active.contact);
        this.log(detailUpdate ? 'import:duplicate-with-new-details' : 'import:duplicate');
        this.publish({ ...active, name, stage: 'duplicate', existingName: existing.name, detailUpdate, error: null });
        return;
      }
      const conflict = this.nameConflict(book, active.contact, name);
      if (conflict !== null) {
        this.log('import:name-conflict');
        this.publish({ ...active, name, stage: 'review', error: conflict });
        return;
      }
      const details = sharedDetails(active.contact);
      if (details.phone === undefined && details.email === undefined) {
        await this.store.rememberContact(name, active.contact.nodePubkey);
      } else {
        await this.store.rememberContact(name, active.contact.nodePubkey, details);
      }
      this.log('import:saved');
      this.publish({ ...active, name, stage: 'saved', error: null });
    } catch (cause) {
      this.log('import:save-failed');
      this.publish({
        ...active, name, stage: 'review',
        error: cause instanceof Error && cause.message === 'another contact already uses that name'
          ? NAME_CONFLICT : 'The contact could not be saved. Try again.',
      });
    }
  };

  /** Saves the new phone/email of an already saved node under its existing
   * local name; re-reads the book so a concurrent edit is not overwritten. */
  updateDetails = async (): Promise<void> => {
    const active = this.snapshot.active;
    if (active?.stage !== 'duplicate' || active.contact === null || active.detailUpdate === null) return;
    this.publish({ ...active, stage: 'saving', error: null });
    try {
      const book = await this.readBook();
      const existing = book.contacts.find((entry) => entry.nodePubkey.toLowerCase() === active.contact!.nodePubkey);
      if (existing === undefined) {
        this.publish({ ...active, stage: 'duplicate', error: 'This contact was deleted. Open the link again to add it.' });
        return;
      }
      await this.store.rememberContact(existing.name, existing.nodePubkey, {
        phone: active.detailUpdate.phone ?? existing.phone,
        email: active.detailUpdate.email ?? existing.email,
      });
      this.log('import:details-updated');
      this.publish({ ...active, name: existing.name, existingName: existing.name, stage: 'updated', error: null });
    } catch {
      this.log('import:save-failed');
      this.publish({ ...active, stage: 'duplicate', error: 'The contact could not be updated. Try again.' });
    }
  };

  close = (): boolean => {
    const active = this.snapshot.active;
    if (active?.stage === 'saving') return false;
    if (active !== null) {
      this.log('import:closed');
      this.recentlyClosed.set(active.key, this.now());
      // At most a small session-local deduplication window is retained.
      if (this.recentlyClosed.size > 32) this.recentlyClosed.delete(this.recentlyClosed.keys().next().value!);
    }
    this.publish(null, this.queue.length > 0 && this.snapshot.overflowed);
    return true;
  };
}
