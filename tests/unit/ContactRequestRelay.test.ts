import { decodeContactLink } from '../../src/services/metevo/contactLink';
import {
  ContactRequestUnavailableError,
  createMockContactRequestRelay,
  createUnavailableContactRequestRelay,
} from '../../src/services/metevo/contactRequestRelay';
import {
  listPendingContacts,
  markPendingContactRequested,
  rememberPendingContact,
} from '../../src/services/metevo/contacts';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
}));

const ME = { name: 'Edi', nodePubkey: `02${'ab'.repeat(32)}` };
const THEM = `03${'cd'.repeat(32)}`;

beforeEach(() => { mockStore.clear(); });

describe('contact request relay seam', () => {
  test('the mock answers with a contact link carrying the requested details', async () => {
    const relay = createMockContactRequestRelay({ answer: (to) => ({ name: 'Luca', nodePubkey: THEM, ...to }) });
    const { requestId } = await relay.sendContactRequest({ to: { phone: '+393331234567' }, from: ME });
    await expect(relay.pollContactRequest(requestId)).resolves.toEqual({ status: 'pending' });
    const answer = await relay.pollContactRequest(requestId);
    expect(answer.status).toBe('answered');
    expect(answer.status === 'answered' && decodeContactLink(answer.link)).toEqual({
      name: 'Luca', nodePubkey: THEM, phone: '+393331234567',
    });
  });

  test('declined and unknown requests are reported, never invented', async () => {
    const relay = createMockContactRequestRelay({ answer: () => null });
    const { requestId } = await relay.sendContactRequest({ to: { email: 'luca@example.com' }, from: ME });
    await relay.pollContactRequest(requestId);
    await expect(relay.pollContactRequest(requestId)).resolves.toEqual({ status: 'declined' });
    await expect(relay.pollContactRequest('missing')).resolves.toEqual({ status: 'expired' });
  });

  test('a request needs a phone or an email and a valid requester', async () => {
    const relay = createMockContactRequestRelay({ answer: () => null });
    await expect(relay.sendContactRequest({ to: {}, from: ME })).rejects.toThrow('phone number or an email');
    await expect(relay.sendContactRequest({ to: { phone: '+393331234567' }, from: { ...ME, nodePubkey: 'x' } })).rejects.toThrow();
  });

  test('without server routes the LSP seam says so instead of pretending to send', async () => {
    const relay = createUnavailableContactRequestRelay();
    await expect(relay.sendContactRequest({ to: { phone: '+393331234567' }, from: ME })).rejects.toBeInstanceOf(
      ContactRequestUnavailableError,
    );
  });

  test('a sent request is remembered on the pending contact', async () => {
    const luca = await rememberPendingContact('Luca', { phone: '+393331234567' });
    await markPendingContactRequested(luca.id, 'request-1');
    await expect(listPendingContacts()).resolves.toMatchObject([{ id: luca.id, requestId: 'request-1' }]);
    await expect(markPendingContactRequested('missing', 'request-2')).rejects.toThrow('not found');
  });
});
