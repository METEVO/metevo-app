/**
 * Two-phone payment against the live regtest stack (infra/regtest):
 *   infra/regtest/regtest.sh up && infra/regtest/regtest.sh bootstrap
 *   METEVO_IT_ALICE_URL=http://127.0.0.1:3101 METEVO_IT_BOB_URL=http://127.0.0.1:3102 \
 *     npx jest tests/integration
 * Skipped when the URLs are unset, so the unit run never needs Docker.
 */
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: '/tmp/remote-it/' }));
jest.mock('../../src/services/metevo/secure-store', () => ({
  authenticateToAccessSecrets: jest.fn(),
}));

import {
  REMOTE_WALLET_ID,
  createRemoteRlnWalletSessionGateway,
} from '../../src/services/metevo/remoteRlnGateway';
import { createRlnRestClient } from '../../src/services/metevo/rlnRestClient';
import type { WalletSessionGateway } from '../../src/services/metevo/wallet-gateway';

const ALICE_URL = process.env.METEVO_IT_ALICE_URL;
const BOB_URL = process.env.METEVO_IT_BOB_URL;
const describeWithNodes = ALICE_URL && BOB_URL ? describe : describe.skip;

const ONE_USDM = 100_000_000;
const SETTLE_TIMEOUT_MS = 60_000;

async function openPhone(nodeUrl: string): Promise<WalletSessionGateway> {
  const gateway = createRemoteRlnWalletSessionGateway({
    createClient: async () => createRlnRestClient({ baseUrl: nodeUrl, timeoutMs: 30_000 }),
    authenticate: async () => undefined,
    usdmTicker: process.env.METEVO_IT_USDM_TICKER ?? 'USDM',
    pinnedUsdmAssetId: null,
    peerUri: null,
    channelWaitTimeoutMs: 30_000,
    channelPollIntervalMs: 1_000,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });
  await gateway.openWallet(REMOTE_WALLET_ID, () => undefined);
  return gateway;
}

async function waitForSettlement(payer: WalletSessionGateway, paymentHash: string): Promise<string> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  let status = await payer.checkPayment(paymentHash);
  while ((status === 'pending' || status === 'unknown') && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    status = await payer.checkPayment(paymentHash);
  }
  return status;
}

describeWithNodes('two phones on the regtest stack', () => {
  jest.setTimeout(120_000);

  test('alice pays bob 1 USDm over their channel through the app gateway', async () => {
    const alice = await openPhone(ALICE_URL!);
    const bob = await openPhone(BOB_URL!);

    const aliceBefore = await alice.readStatus();
    const bobBefore = await bob.readStatus();
    expect(aliceBefore.channelReady).toBe(true);
    expect(bobBefore.channelReady).toBe(true);

    const { invoice, paymentHash } = await bob.createUsdmInvoice(ONE_USDM);
    const submitted = await alice.submitPayment({ invoice });
    expect(submitted.paymentHash).toBe(paymentHash);

    await expect(waitForSettlement(alice, paymentHash!)).resolves.toBe('settled');

    const aliceAfter = await alice.readStatus();
    const bobAfter = await bob.readStatus();
    expect(aliceAfter.balanceUsdmBaseUnits).toBe(aliceBefore.balanceUsdmBaseUnits! - ONE_USDM);
    expect(bobAfter.balanceUsdmBaseUnits).toBe(bobBefore.balanceUsdmBaseUnits! + ONE_USDM);
  });
});
