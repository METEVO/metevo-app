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
/** rgb-lib status strings -> watch status. Unknown strings stay pending:
 * only a confirmed Settled/Failed ever terminates the watch. */
export function mapTransferStatus(rawStatus) {
    const status = rawStatus.toLowerCase();
    if (status === 'settled') {
        return 'settled';
    }
    if (status === 'failed') {
        return 'failed';
    }
    return 'pending';
}
function defaultNow() {
    return Date.now();
}
function defaultDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function toTransferInfo(entry) {
    if (typeof entry !== 'object' || entry === null) {
        return null;
    }
    const record = entry;
    const transferId = String(record.transfer_id ?? record.transferId ?? record.txid ?? '');
    if (transferId.length === 0) {
        return null;
    }
    const amountRaw = record.amount ?? record.assignment_amount ?? null;
    const amount = typeof amountRaw === 'number' && Number.isFinite(amountRaw) ? amountRaw : null;
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
export async function watchTransfersToTerminal(options) {
    const now = options.now ?? defaultNow;
    const delay = options.delay ?? defaultDelay;
    const startedAt = now();
    let baselineIds = options.transferId !== undefined ? new Set() : null;
    let lastWatched = null;
    while (true) {
        if (options.shouldStop?.() === true) {
            return { status: 'unknown', transfer: null };
        }
        const entries = await options.refresh();
        const transfers = entries
            .map(toTransferInfo)
            .filter((entry) => entry !== null);
        if (baselineIds === null) {
            baselineIds = new Set(transfers.map((entry) => entry.transferId));
        }
        const baseline = baselineIds;
        const watched = transfers.find((entry) => options.transferId !== undefined
            ? entry.transferId === options.transferId
            : !baseline.has(entry.transferId));
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
