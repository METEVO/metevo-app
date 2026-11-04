import { encodeContactLink, type SharedContact } from './contactLink';
import type { ContactDetails } from './contacts';

/**
 * Contact request seam: ask someone known only by phone or email for their
 * METEVO contact. The answer is a contact link, which the app imports
 * through the same confirmation card as deep links and QR codes.
 *
 * The server side (directory of verified phones/emails and the request
 * inbox) belongs to the LSP and is not built yet. Until it exists the LSP seam
 * reports itself as unavailable.
 */
export interface ContactRequestRelay {
  sendContactRequest(params: {
    to: ContactDetails;
    /** The requester's own contact, so the recipient knows who is asking. */
    from: SharedContact;
  }): Promise<{ requestId: string }>;
  pollContactRequest(requestId: string): Promise<ContactRequestStatus>;
}

export type ContactRequestStatus =
  | { status: 'pending' }
  | { status: 'answered'; link: string }
  | { status: 'declined' }
  | { status: 'expired' };

export class ContactRequestUnavailableError extends Error {
  constructor() {
    super('Contact requests are not available on this server yet.');
    this.name = 'ContactRequestUnavailableError';
  }
}

function assertReachable(to: ContactDetails): void {
  if (!to.phone && !to.email) {
    throw new Error('a phone number or an email is required');
  }
}

export function createUnavailableContactRequestRelay(): ContactRequestRelay {
  return {
    async sendContactRequest() {
      throw new ContactRequestUnavailableError();
    },
    async pollContactRequest() {
      throw new ContactRequestUnavailableError();
    },
  };
}

export interface MockContactRequestRelayOptions {
  /** Stands in for the recipient accepting and sending their contact.
   * requestId lets the stand-in give every request its own node. */
  answer: (to: ContactDetails, requestId: string) => SharedContact | null;
}

/** In-process stand-in for demos and tests: the first poll is pending, the
 * next one returns the recipient's answer. */
export function createMockContactRequestRelay(options: MockContactRequestRelayOptions): ContactRequestRelay {
  const requests = new Map<string, { to: ContactDetails; polled: boolean }>();
  let sequence = 0;
  return {
    async sendContactRequest({ to, from }) {
      assertReachable(to);
      encodeContactLink(from);
      sequence += 1;
      const requestId = `mock-contact-request-${sequence}`;
      requests.set(requestId, { to, polled: false });
      return { requestId };
    },
    async pollContactRequest(requestId) {
      const request = requests.get(requestId);
      if (request === undefined) return { status: 'expired' };
      if (!request.polled) {
        request.polled = true;
        return { status: 'pending' };
      }
      const contact = options.answer(request.to, requestId);
      return contact === null ? { status: 'declined' } : { status: 'answered', link: encodeContactLink(contact) };
    },
  };
}

/** Demo answer: a node of its own for every request (a fixed node would be
 * reported as already saved from the second demo on), tagged with the
 * details that were asked for so the import completes the pending contact. */
function demoNodePubkey(requestId: string): string {
  const seed = `${Date.now().toString(16)}${requestId.replace(/\D/g, '')}`;
  return `02${seed.padStart(64, '0').slice(-64)}`;
}

let sessionRelay: ContactRequestRelay | null = null;

/** One relay per session, so mock requests survive the panel closing.
 * serverMode comes from relayAvailable(): mock wallets use the demo relay. */
export function getContactRequestRelay(serverMode: boolean): ContactRequestRelay {
  sessionRelay ??= serverMode
    ? createUnavailableContactRequestRelay()
    : createMockContactRequestRelay({
      answer: (to, requestId) => ({ name: 'Demo contact', nodePubkey: demoNodePubkey(requestId), ...to }),
    });
  return sessionRelay;
}
