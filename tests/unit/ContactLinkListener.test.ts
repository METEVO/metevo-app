import { listenForContactLinks } from '../../src/services/metevo/contactLinkListener';
import { encodeContactLink } from '../../src/services/metevo/contactLink';

jest.mock('expo-secure-store', () => ({}));

const NODE = `02${'ab'.repeat(32)}`;
const LINK = encodeContactLink({ name: 'Maria', nodePubkey: NODE });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

function fixture() {
  let initial!: (url: string | null) => void;
  let reject!: (error: Error) => void;
  let listener!: (event: { url: string }) => void;
  const remove = jest.fn();
  const port = {
    getInitialURL: jest.fn(() => new Promise<string | null>((done, fail) => { initial = done; reject = fail; })),
    addEventListener: jest.fn((_type: 'url', handler: typeof listener) => { listener = handler; return { remove }; }),
  };
  const enqueue = jest.fn();
  const stop = listenForContactLinks(port, enqueue);
  return { port, enqueue, stop, remove, initial: (url: string | null) => initial(url), reject: () => reject(new Error('platform failed')), live: (url: string) => listener({ url }) };
}

describe('cold and warm contact links', () => {
  test('listens once before recovering the launch URL', async () => {
    const { port, enqueue, initial } = fixture();
    expect(port.addEventListener).toHaveBeenCalledTimes(1);
    expect(port.addEventListener.mock.invocationCallOrder[0]).toBeLessThan(port.getInitialURL.mock.invocationCallOrder[0]);
    initial(LINK);
    await flush();
    expect(enqueue).toHaveBeenCalledWith(LINK);
  });

  test('a late launch URL is deduplicated against the equivalent live event', async () => {
    const { enqueue, initial, live } = fixture();
    live(`metevo://contact?node=${NODE.toUpperCase()}&name=Maria&v=1`);
    initial(LINK);
    await flush();
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  test('warm links still arrive after initial URL recovery fails', async () => {
    const { enqueue, reject, live } = fixture();
    reject();
    await flush();
    live(LINK);
    expect(enqueue).toHaveBeenCalledWith(LINK);
  });

  test('cleanup removes the listener and ignores late promises and callbacks', async () => {
    const { enqueue, stop, remove, initial, live } = fixture();
    stop();
    initial(LINK);
    live(LINK);
    await flush();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(enqueue).not.toHaveBeenCalled();
  });

  test('ignores unrelated schemes but lets the import card explain invalid METEVO links', async () => {
    const { enqueue, initial, live } = fixture();
    initial(null);
    live('https://example.com');
    live('exp://development-client');
    live('metevo://contact?broken');
    await flush();
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith('metevo://contact?broken');
  });

  test('development-client launch URLs and other app routes never open contact errors', async () => {
    const { enqueue, initial, live } = fixture();
    initial('metevo://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081');
    live('metevo://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081');
    live('metevo://other?v=1');
    live(`metevo://contact.evil?v=1&name=Maria&node=${NODE}`);
    await flush();
    expect(enqueue).not.toHaveBeenCalled();
  });
});
