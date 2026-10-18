/**
 * Transfer settlement watcher (runtime-agnostic).
 *
 * Drives the WDK refreshTransfers state machine: poll until a watched RGB
 * transfer leaves Pending for a terminal state (Settled / Failed) or the
 * deadline turns the outcome into "unknown" - never a guessed success.
 *
 * This module must stay free of wallet-runtime and React imports: the
 * worklet compiles its dependencies (wallet.ts) and the unit tests run it
 * under plain Node with injected clocks and delays.
 */

/** Terminal and non-terminal watch outcomes, per the design rules. */
export type TransferWatchStatus = 'pending' | 'settled' | 'failed' | 'unknown';

/** Minimal structural view of a WDK rgb-lib transfer entry. Only the
 * fields verified against the node contract are typed; everything else is
 * ignored instead of guessed. */
export interface TransferInfo {
  transferId: string;
  kind: string;
  status: string;
  amount: number | null;
}

export interface TransferWatchResult {
  status: TransferWatchStatus;
  /** The watched transfer in its terminal state; null when unknown. */
  transfer: TransferInfo | null;
}

export interface TransferWatchOptions {
  /** One poll: refresh transfers (WDK refreshTransfers + list) and return
   * the current list for the session asset. */
  refresh: () => Promise<TransferInfo[]>;
  /** Poll cadence in ms. */
  intervalMs: number;
  /** Max wall time in ms before the outcome becomes unknown. */
  timeoutMs: number;
  /** Watch exactly this transfer id (payer path). */
  transferId?: string;
  /** Cooperative cancellation; checked between polls (React unmount). */
  shouldStop?: () => boolean;
  /** Injected clock for deterministic tests. */
  now?: () => number;
  /** Injected delay for deterministic tests. */
  delay?: (ms: number) => Promise<void>;
}

/** rgb-lib status strings -> watch status. Unknown strings stay pending:
 * only a confirmed Settled/Failed ever terminates the watch. */
export function mapTransferStatus(rawStatus: string): TransferWatchStatus {
  const status = rawStatus.toLowerCase();
  if (status === 'settled') {
    return 'settled';
  }
  if (status === 'failed') {
    return 'failed';
  }
  return 'pending';
}

function defaultNow(): number {
  return Date.now();
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toTransferInfo(entry: unknown): TransferInfo | null {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const transferId = String(
    record.transfer_id ?? record.transferId ?? record.txid ?? '',
  );
  if (transferId.length === 0) {
    return null;
  }
  const amountRaw = record.amount ?? record.assignment_amount ?? null;
  const amount =
    typeof amountRaw === 'number' && Number.isFinite(amountRaw) ? amountRaw : null;
  return {
    transferId,
    kind: String(record.kind ?? ''),
    status: String(record.status ?? ''),
    amount,
  };
}

/**
 * Poll `refresh` until a watched transfer reaches a terminal state.
 *
 * Watched means: the requested `transferId` when given, otherwise any
 * transfer NOT present in the baseline snapshot captured by the first
 * refresh (pre-existing settled transfers must not fake a settlement).
 */
export async function watchTransfersToTerminal(
  options: TransferWatchOptions,
): Promise<TransferWatchResult> {
  const now = options.now ?? defaultNow;
  const delay = options.delay ?? defaultDelay;
  const startedAt = now();
  let baselineIds: Set<string> | null =
    options.transferId !== undefined ? new Set<string>() : null;
  let lastWatched: TransferInfo | null = null;

  while (true) {
    if (options.shouldStop?.() === true) {
      return { status: 'unknown', transfer: null };
    }
    const entries = await options.refresh();
    const transfers = entries
      .map(toTransferInfo)
      .filter((entry): entry is TransferInfo => entry !== null);

    if (baselineIds === null) {
      baselineIds = new Set(transfers.map((entry) => entry.transferId));
    }
    const baseline = baselineIds;

    const watched = transfers.find(
      (entry) =>
        options.transferId !== undefined
          ? entry.transferId === options.transferId
          : !baseline.has(entry.transferId),
    );
    if (watched !== undefined) {
      lastWatched = watched;
      const status = mapTransferStatus(watched.status);
      if (status === 'settled' || status === 'failed') {
        return { status, transfer: watched };
      }
    }

    const elapsed = now() - startedAt;
    if (elapsed >= options.timeoutMs) {
      return { status: 'unknown', transfer: lastWatched };
    }
    const remaining = options.timeoutMs - elapsed;
    await delay(Math.min(options.intervalMs, remaining));
  }
}
