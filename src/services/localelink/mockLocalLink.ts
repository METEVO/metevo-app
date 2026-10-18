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
  serveInvoice(params: {
    sessionId: string;
    invoice: string;
    /** When the receiver's LDK node listens on the group, the payer may
     * settle over a direct channel (see offlineChannel.ts). */
    nodePubkey?: string;
    ldkPort?: number;
  }): Promise<void>;
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
 * (`fetch <sessionId>`), one response line. Response forms:
 *   `error <reason>`                         - nothing to serve
 *   `direct <invoice> <nodePubkey> <ldkPort>` - invoice + direct route hint
 *   `<invoice>`                              - invoice, LSP-routed only
 * Defined here so payer and receiver never drift.
 */
export const localLinkFetchInvoiceProtocol = {
  requestLine(sessionId: string): string {
    return `fetch ${sessionId}\n`;
  },
  parseResponse(
    line: string,
  ): { invoice: string } | { error: string } | { direct: { invoice: string; nodePubkey: string; ldkPort: number } } {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      throw new Error('local link: empty socket response');
    }
    if (trimmed.startsWith('error ')) {
      return { error: trimmed.slice('error '.length) };
    }
    if (trimmed.startsWith('direct ')) {
      const parts = trimmed.split(' ');
      if (parts.length !== 4) {
        throw new Error('local link: malformed direct response');
      }
      const ldkPort = Number(parts[3]);
      if (!Number.isInteger(ldkPort) || ldkPort < 1 || ldkPort > 65_535) {
        throw new Error('local link: malformed direct response port');
      }
      return {
        direct: { invoice: parts[1], nodePubkey: parts[2], ldkPort },
      };
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
  let served: {
    sessionId: string;
    invoice: string;
    nodePubkey: string | null;
    ldkPort: number | null;
  } | null = null;
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
      served = {
        sessionId: params.sessionId,
        invoice: params.invoice,
        nodePubkey: params.nodePubkey ?? null,
        ldkPort: params.ldkPort ?? null,
      };
    },
    async fetchInvoice(params) {
      if (!running) {
        throw new Error('local link: the group is not running (link closed)');
      }
      if (served === null || served.sessionId !== params.sessionId) {
        throw new Error('local link: unknown session');
      }
      // The receiver answers with the direct hint when its LDK node
      // listens on the group interface.
      const responseLine =
        served.nodePubkey !== null && served.ldkPort !== null
          ? `direct ${served.invoice} ${served.nodePubkey} ${served.ldkPort}`
          : served.invoice;
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
          resolve(responseLine);
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
