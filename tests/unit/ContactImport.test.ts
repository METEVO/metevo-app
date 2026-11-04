import { ContactImportController, MAX_PENDING_CONTACT_LINKS } from '../../src/services/metevo/contactImport';
import { encodeContactLink } from '../../src/services/metevo/contactLink';
import {
  findContactByName,
  listContacts,
  listPendingContacts,
  rememberContact,
  rememberPendingContact,
} from '../../src/services/metevo/contacts';
import { replyForContactImport } from '../../src/voice/replies';
import { pendingHomeEvent } from '../../src/utils/pendingHomeEvent';
import type { StoredContact } from '../../src/services/metevo/contacts';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
}));

const NODE = `02${'ab'.repeat(32)}`;
const OTHER_NODE = `03${'cd'.repeat(32)}`;
const contact = { name: 'Maria', nodePubkey: NODE };
const link = encodeContactLink(contact);
const saved = { ...contact, addedAt: '2026-10-28T12:00:00Z' };
const flush = async () => { for (let tick = 0; tick < 6; tick += 1) await Promise.resolve(); };

function fixture(initial: StoredContact[] = []) {
  const store = {
    listContacts: jest.fn(async (): Promise<StoredContact[]> => initial),
    rememberContact: jest.fn(async (name: string, nodePubkey: string) => ({ name, nodePubkey, addedAt: saved.addedAt })),
  };
  return { store, controller: new ContactImportController(store) };
}

describe('contact import lifecycle', () => {
  beforeEach(() => { mockStore.clear(); });

  test('queues without reading or saving until the wallet and shell are available', async () => {
    const { controller, store } = fixture();
    controller.enqueue(link);
    expect(controller.openNext(false)).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({ active: null, pendingCount: 1 });
    expect(store.listContacts).not.toHaveBeenCalled();
    expect(store.rememberContact).not.toHaveBeenCalled();
    expect(controller.openNext(true)).toBe(true);
    await flush();
    expect(controller.getSnapshot().active?.stage).toBe('review');
    expect(store.rememberContact).not.toHaveBeenCalled();
  });

  test('cancel never persists, and a late storage read cannot reopen the card', async () => {
    const { controller, store } = fixture();
    let resolve!: (value: StoredContact[]) => void;
    store.listContacts.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    controller.enqueue(link);
    controller.openNext(true);
    expect(controller.close()).toBe(true);
    resolve([]);
    await flush();
    expect(controller.getSnapshot().active).toBeNull();
    expect(store.rememberContact).not.toHaveBeenCalled();
  });

  test('double confirmation makes one storage write, and Back waits for it', async () => {
    const { controller, store } = fixture();
    let resolve!: (value: StoredContact) => void;
    store.rememberContact.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    const first = controller.confirm();
    const second = controller.confirm();
    expect(controller.getSnapshot().active?.stage).toBe('saving');
    expect(controller.close()).toBe(false);
    controller.setName('Unconfirmed rename');
    await flush();
    expect(store.rememberContact).toHaveBeenCalledTimes(1);
    expect(store.rememberContact).toHaveBeenCalledWith('Maria', NODE);
    resolve(saved);
    await Promise.all([first, second]);
    expect(controller.getSnapshot().active?.stage).toBe('saved');
    expect(controller.close()).toBe(true);
  });

  test('the real contact store still resolves an imported recipient for the relay', async () => {
    const controller = new ContactImportController({ listContacts, rememberContact });
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    await controller.confirm();
    expect(await findContactByName(' maria ')).toMatchObject(contact);
    expect(await listContacts()).toHaveLength(1);
  });

  test('same pubkey is reported as already saved without overwriting its local name', async () => {
    await rememberContact('Local alias', NODE);
    const controller = new ContactImportController({ listContacts, rememberContact });
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    expect(controller.getSnapshot().active).toMatchObject({ stage: 'duplicate', existingName: 'Local alias' });
    await controller.confirm();
    expect(await findContactByName('Local alias')).not.toBeNull();
    expect(await findContactByName('Maria')).toBeNull();
  });

  test('name collisions require a new local name before saving', async () => {
    await rememberContact('maria', OTHER_NODE);
    const controller = new ContactImportController({ listContacts, rememberContact });
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    expect(controller.getSnapshot().active?.error).toContain('different name');
    await controller.confirm();
    expect(await listContacts()).toHaveLength(1);
    controller.setName(' Maria work ');
    await controller.confirm();
    expect(controller.getSnapshot().active).toMatchObject({ stage: 'saved', name: 'Maria work' });
    expect(await findContactByName('Maria work')).toMatchObject({ nodePubkey: NODE });
    expect(await findContactByName('Maria')).toMatchObject({ nodePubkey: OTHER_NODE });
  });

  test('rechecks duplicates introduced after opening the confirmation', async () => {
    const { controller, store } = fixture();
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    store.listContacts.mockResolvedValue([{ ...saved, name: 'Already added' }]);
    await controller.confirm();
    expect(controller.getSnapshot().active?.stage).toBe('duplicate');
    expect(store.rememberContact).not.toHaveBeenCalled();
  });

  test('read failure is recoverable and never allows a blind write', async () => {
    const { controller, store } = fixture();
    store.listContacts.mockRejectedValueOnce(new Error('store offline'));
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    expect(controller.getSnapshot().active?.stage).toBe('load-error');
    await controller.confirm();
    expect(store.rememberContact).not.toHaveBeenCalled();
    controller.retry();
    await flush();
    expect(controller.getSnapshot().active?.stage).toBe('review');
  });

  test.each(['another contact already uses that name', 'storage failure']) (
    'write failure returns to an editable review: %s', async (message) => {
      const { controller, store } = fixture();
      store.rememberContact.mockRejectedValueOnce(new Error(message));
      controller.enqueue(link);
      controller.openNext(true);
      await flush();
      await controller.confirm();
      expect(controller.getSnapshot().active).toMatchObject({ stage: 'review', error: expect.any(String) });
      await controller.confirm();
      expect(controller.getSnapshot().active?.stage).toBe('saved');
    },
  );

  test('read failure during confirm does not save or claim success', async () => {
    const { controller, store } = fixture();
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    store.listContacts.mockRejectedValueOnce(new Error('store failed'));
    await controller.confirm();
    expect(controller.getSnapshot().active?.stage).toBe('review');
    expect(store.rememberContact).not.toHaveBeenCalled();
  });

  test('invalid draft names stay in review without storage writes', async () => {
    const { controller, store } = fixture();
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    controller.setName('\u202eBad');
    await controller.confirm();
    expect(controller.getSnapshot().active?.stage).toBe('review');
    expect(controller.getSnapshot().active?.error).not.toBeNull();
    expect(store.rememberContact).not.toHaveBeenCalled();
  });

  test('malformed links show a clear error and never access the store', async () => {
    const { controller, store } = fixture();
    controller.enqueue('metevo://contact?v=99');
    controller.openNext(true);
    await controller.confirm();
    expect(controller.getSnapshot().active).toMatchObject({ stage: 'invalid', error: expect.any(String) });
    expect(store.listContacts).not.toHaveBeenCalled();
    expect(store.rememberContact).not.toHaveBeenCalled();
  });

  test('canonical duplicates and a burst of links cannot replace the active contact', async () => {
    const { controller } = fixture();
    controller.enqueue(link);
    expect(controller.enqueue(`metevo://contact?node=${NODE.toUpperCase()}&name=Maria&v=1`)).toBe(false);
    controller.openNext(true);
    await flush();
    const activeId = controller.getSnapshot().active?.id;
    for (let i = 0; i < MAX_PENDING_CONTACT_LINKS + 1; i++) {
      controller.enqueue(encodeContactLink({ name: `Name ${i}`, nodePubkey: OTHER_NODE }));
    }
    expect(controller.getSnapshot()).toMatchObject({ pendingCount: MAX_PENDING_CONTACT_LINKS, overflowed: true });
    expect(controller.getSnapshot().active?.id).toBe(activeId);
  });

  test('same link can be intentionally reopened after the duplicate-event window', () => {
    let now = 0;
    const { store } = fixture();
    const controller = new ContactImportController(store, () => now);
    controller.enqueue(link);
    controller.openNext(true);
    controller.close();
    expect(controller.enqueue(link)).toBe(false);
    now = 2_001;
    expect(controller.enqueue(link)).toBe(true);
  });

  test('import state survives a card subscriber leaving and returning', async () => {
    const { controller } = fixture();
    const listener = jest.fn();
    const off = controller.subscribe(listener);
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    controller.setName('Maria work');
    off();
    const active = controller.getSnapshot().active;
    expect(controller.openNext(false)).toBe(false);
    expect(controller.getSnapshot().active).toBe(active);
    const nextListener = jest.fn();
    controller.subscribe(nextListener);
    await controller.confirm();
    expect(controller.getSnapshot().active).toMatchObject({ name: 'Maria work', stage: 'saved' });
    expect(nextListener).toHaveBeenCalled();
  });

  test('every visible stage has a spoken sentence; draft keystrokes do not change the prompt', async () => {
    const { controller } = fixture();
    controller.enqueue(link);
    controller.openNext(true);
    await flush();
    const review = controller.getSnapshot().active!;
    const message = replyForContactImport(review);
    controller.setName('Maria work');
    expect(replyForContactImport(controller.getSnapshot().active!)).toBe(message);
    for (const stage of ['loading', 'review', 'saving', 'saved', 'duplicate', 'invalid', 'load-error'] as const) {
      expect(replyForContactImport({ ...review, stage, existingName: 'Known contact' }).length).toBeGreaterThan(0);
    }
  });
});

describe('Home incoming-event arbitration', () => {
  const ready = { walletReady: true, cardBusy: false, voiceBusy: false, hasInvoice: false, hasContact: true };
  test.each(['wallet', 'card', 'voice'])('defers an import while %s is unavailable or busy', (reason) => {
    const state = { ...ready, walletReady: reason !== 'wallet', cardBusy: reason === 'card', voiceBusy: reason === 'voice' };
    expect(pendingHomeEvent(state)).toBeNull();
  });
  test('invoices have priority and contacts resume after the current task closes', () => {
    expect(pendingHomeEvent({ ...ready, hasInvoice: true })).toBe('invoice-request');
    expect(pendingHomeEvent({ ...ready, hasInvoice: true, cardBusy: true })).toBeNull();
    expect(pendingHomeEvent(ready)).toBe('import-contact');
    expect(pendingHomeEvent({ ...ready, hasContact: false })).toBeNull();
  });
});

describe('importing phone and email (v2 links)', () => {
  const realStore = { listContacts, listPendingContacts, rememberContact };
  const v2Link = encodeContactLink({ ...contact, phone: '+393331234567', email: 'maria@example.com' });

  beforeEach(() => { mockStore.clear(); });

  async function openAndWait(controller: ContactImportController, incoming: string) {
    controller.enqueue(incoming);
    controller.openNext(true);
    await flush();
  }

  test('saves the shared phone and email with the contact', async () => {
    const controller = new ContactImportController(realStore);
    await openAndWait(controller, v2Link);
    await controller.confirm();
    expect(await findContactByName('Maria')).toMatchObject({
      nodePubkey: NODE, phone: '+393331234567', email: 'maria@example.com',
    });
  });

  test('completes a pending contact and keeps the name chosen on this phone', async () => {
    await rememberPendingContact('Mamma', { phone: '+393331234567' });
    const controller = new ContactImportController(realStore);
    await openAndWait(controller, v2Link);
    expect(controller.getSnapshot().active).toMatchObject({ stage: 'review', name: 'Mamma', pendingName: 'Mamma', error: null });
    await controller.confirm();
    expect(controller.getSnapshot().active?.stage).toBe('saved');
    expect(await listPendingContacts()).toEqual([]);
    expect(await findContactByName('mamma')).toMatchObject({ nodePubkey: NODE });
  });

  test('a different pending contact still blocks its name', async () => {
    await rememberPendingContact('Maria', { email: 'other@example.com' });
    const controller = new ContactImportController(realStore);
    await openAndWait(controller, link);
    expect(controller.getSnapshot().active).toMatchObject({ stage: 'review', pendingName: null });
    expect(controller.getSnapshot().active?.error).toContain('already used');
  });
});

describe('contact test-trail events', () => {
  beforeEach(() => { mockStore.clear(); });

  test('the import controller reports each outcome with fixed labels only', async () => {
    const events: string[] = [];
    const controller = new ContactImportController(
      { listContacts, listPendingContacts, rememberContact }, Date.now, (event) => { events.push(event); },
    );
    controller.enqueue(encodeContactLink({ ...contact, phone: '+393331234567' }));
    controller.enqueue('metevo://contact?v=1&name=Bad');
    controller.openNext(true);
    await flush();
    await controller.confirm();
    controller.close();
    expect(events).toEqual(['import:queued', 'import:invalid', 'import:review', 'import:saved', 'import:closed']);
    expect(events.join(' ')).not.toMatch(/Maria|393331234567|02ab/);
  });
});
