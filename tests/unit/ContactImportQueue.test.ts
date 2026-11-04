import { ContactImportController } from '../../src/services/metevo/contactImport';
import { keepImportQueue, readSavedImportLinks, saveImportLinks } from '../../src/services/metevo/contactImportQueue';
import { encodeContactLink } from '../../src/services/metevo/contactLink';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockStore.delete(key); }),
}));

const LINK = encodeContactLink({ name: 'Maria', nodePubkey: `02${'ab'.repeat(32)}` });
const OTHER = encodeContactLink({ name: 'Bob', nodePubkey: `03${'cd'.repeat(32)}` });
const flush = async () => { for (let tick = 0; tick < 8; tick += 1) await Promise.resolve(); };

function controller() {
  return new ContactImportController({ listContacts: async () => [], rememberContact: jest.fn() });
}

beforeEach(() => { mockStore.clear(); });

describe('saved import queue', () => {
  test('keeps only valid canonical links', async () => {
    mockStore.set('metevo.contacts.importQueue', JSON.stringify([LINK, 'metevo://contact?v=1&name=Bad', 42, OTHER]));
    await expect(readSavedImportLinks()).resolves.toEqual([LINK, OTHER]);
    mockStore.set('metevo.contacts.importQueue', 'not-json');
    await expect(readSavedImportLinks()).resolves.toEqual([]);
  });

  test('an empty queue removes the saved copy', async () => {
    await saveImportLinks([LINK]);
    await saveImportLinks([]);
    expect(mockStore.has('metevo.contacts.importQueue')).toBe(false);
  });

  test('links saved by the previous session come back, then changes are mirrored', async () => {
    await saveImportLinks([LINK]);
    const imports = controller();
    const events: string[] = [];
    const stop = keepImportQueue(imports, (event) => { events.push(event); });
    await flush();
    expect(imports.getSnapshot().pendingCount).toBe(1);
    expect(events).toEqual(['import:restored']);
    imports.enqueue(OTHER);
    await flush();
    expect(JSON.parse(mockStore.get('metevo.contacts.importQueue')!)).toEqual([LINK, OTHER]);
    stop();
  });

  test('a link arriving before the restore does not wipe the saved ones', async () => {
    await saveImportLinks([LINK]);
    const imports = controller();
    let release!: () => void;
    const storage = {
      read: () => new Promise<string[]>((resolve) => { release = () => resolve([LINK]); }),
      save: jest.fn(async () => undefined),
    };
    keepImportQueue(imports, undefined, storage);
    imports.enqueue(OTHER);
    expect(storage.save).not.toHaveBeenCalled();
    release();
    await flush();
    expect(storage.save).toHaveBeenLastCalledWith([OTHER, LINK]);
  });
});
