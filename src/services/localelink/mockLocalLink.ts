import { LocalLinkCredentials } from './localLinkFrame';

/**
 * Local-link contract shared by the native module bridge and the mock.
 *
 * The receiver runs: startTagEmulation -> startGroup -> serveInvoice, and
 * MUST call stopGroup in a finally block - it releases the Wi-Fi Direct
 * group, the socket server and the NFC credential, whatever happened.
 * The payer runs: readNfcCredentials (native only) -> fetchInvoice.
 */
export interface LocalLinkGroup {
  ownerAddress: string;
  port: number;
}

export interface LocalLink {
  startTagEmulation(credentials: LocalLinkCredentials): Promise<void>;
  startGroup(port: number): Promise<LocalLinkGroup>;
  /** Payer side: joins the receiver's group with the tag credentials. */
  connectToGroup(ssid: string, password: string, timeoutMs: number): Promise<void>;
  serveInvoice(params: { sessionId: string; invoice: string }): Promise<void>;
  fetchInvoice(params: {
    host: string;
    port: number;
    sessionId: string;
    timeoutMs: number;
  }): Promise<string>;
  stopGroup(): Promise<void>;
  setKeepScreenOn(enabled: boolean): Promise<void>;
  isRunning(): boolean;
}

/**
 * The wire protocol over the P2P TCP socket: one request line
 * (`fetch <sessionId>`), one response line (the invoice, or
 * `error <reason>`). Defined here so payer and receiver never drift.
 */
export const localLinkFetchInvoiceProtocol = {
  requestLine(sessionId: string): string {
    return `fetch ${sessionId}\n`;
  },
  parseResponse(line: string): { invoice: string } | { error: string } {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      throw new Error('local link: empty socket response');
    }
    if (trimmed.startsWith('error ')) {
      return { error: trimmed.slice('error '.length) };
    }
    return { invoice: trimmed };
  },
  errorLine(reason: string): string {
    return `error ${reason}\n`;
  },
};

interface PendingFetch {
  resolve: (invoice: string) => void;
  reject: (cause: Error) => void;
}

/**
 * In-process stand-in for the native module: Expo Go demos, Storybook-like
 * previews and Jest. The socket is simulated; the lifecycle rules (teardown
 * releases served state and rejects pending fetches) are the real contract.
 */
export function createMockLocalLink(defaultPort = 48_444): LocalLink {
  let credentials: LocalLinkCredentials | null = null;
  let served: { sessionId: string; invoice: string } | null = null;
  let running = false;
  const pending = new Set<PendingFetch>();

  function failAllPending(reason: string) {
    for (const waiter of pending) {
      waiter.reject(new Error(reason));
    }
    pending.clear();
  }

  return {
    async startTagEmulation(next) {
      credentials = next;
    },
    async startGroup(port) {
      running = true;
      return { ownerAddress: '192.168.49.1', port };
    },
    async connectToGroup(ssid, password, timeoutMs) {
      if (!running) {
        throw new Error('local link: the group is not running (link closed)');
      }
      // The mock only accepts the credentials it served as a tag.
      if (
        credentials === null ||
        credentials.ssid !== ssid ||
        credentials.password !== password
      ) {
        throw new Error('local link: the tag credentials do not match the group');
      }
      void timeoutMs;
    },
    async serveInvoice(params) {
      served = { sessionId: params.sessionId, invoice: params.invoice };
    },
    async fetchInvoice(params) {
      if (!running) {
        throw new Error('local link: the group is not running (link closed)');
      }
      if (served === null || served.sessionId !== params.sessionId) {
        throw new Error('local link: unknown session');
      }
      const invoice = served.invoice;
      return new Promise<string>((resolve, reject) => {
        const waiter: PendingFetch = { resolve, reject };
        pending.add(waiter);
        setTimeout(() => {
          if (!pending.delete(waiter)) {
            return; // already settled by teardown
          }
          if (!running) {
            reject(new Error('local link: teardown during fetch'));
            return;
          }
          resolve(invoice);
        }, 5);
      });
    },
    async stopGroup() {
      running = false;
      served = null;
      credentials = null;
      failAllPending('local link: teardown during fetch');
    },
    async setKeepScreenOn() {
      // No-op: the mock cannot hold the screen on.
    },
    isRunning() {
      return running;
    },
  };
}
