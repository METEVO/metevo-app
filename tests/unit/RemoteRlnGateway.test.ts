jest.mock('expo-file-system/legacy', () => ({ documentDirectory: '/tmp/remote-gateway-test/' }));
jest.mock('../../src/services/metevo/secure-store', () => ({
  authenticateToAccessSecrets: jest.fn(),
}));

import {
  REMOTE_WALLET_ID,
  RemoteRlnGatewayDependencies,
  createRemoteRlnWalletSessionGateway,
} from '../../src/services/metevo/remoteRlnGateway';
import type { RlnChannel, RlnRestClient } from '../../src/services/metevo/rlnRestClient';

const USDM = 'rgb:usdm-test';
const PEER_PUBKEY = `03${'b'.repeat(64)}`;

function usableUsdmChannel(): RlnChannel {
  return { channel_id: 'c1', peer_pubkey: PEER_PUBKEY, is_usable: true, asset_id: USDM, asset_local_amount: 1 };
}

function fakeClient(overrides: Partial<RlnRestClient> = {}): jest.Mocked<RlnRestClient> {
  return {
    nodeInfo: jest.fn(async () => ({ pubkey: `02${'a'.repeat(64)}`, num_usable_channels: 1, rgb_htlc_min_msat: 3_000_000 })),
    btcBalance: jest.fn(async () => ({
      vanilla: { settled: 0, future: 0, spendable: 99_000 },
      colored: { settled: 0, future: 0, spendable: 0 },
    })),
    assetBalance: jest.fn(async () => ({
      settled: 50_000,
      future: 50_000,
      spendable: 50_000,
      offchain_outbound: 40_100,
      offchain_inbound: 9_900,
    })),
    findNiaAssetIdByTicker: jest.fn(async () => USDM),
    listChannels: jest.fn(async () => [usableUsdmChannel()]),
    listPayments: jest.fn(async () => []),
    createLnInvoice: jest.fn(async () => 'lnbcrt1invoice'),
    decodeLnInvoicePaymentHash: jest.fn(async () => 'f'.repeat(64)),
    decodeLnInvoice: jest.fn(async () => ({
      paymentHash: 'e'.repeat(64),
      payeePubkey: PEER_PUBKEY,
      amountMsat: 3_000_000,
      assetId: USDM,
      assetAmount: 2_000_000_000,
    })),
    sendPayment: jest.fn(async () => ({ paymentHash: 'e'.repeat(64), status: 'Pending' })),
    connectPeer: jest.fn(async () => undefined),
    refreshTransfers: jest.fn(async () => undefined),
    listTransfers: jest.fn(async () => []),
    ...overrides,
  } as jest.Mocked<RlnRestClient>;
}

function gatewayWith(client: RlnRestClient, overrides: Partial<RemoteRlnGatewayDependencies> = {}) {
  const authenticate = jest.fn(async () => undefined);
  const gateway = createRemoteRlnWalletSessionGateway({
    createClient: async () => client,
    authenticate,
    usdmTicker: 'USDM',
    pinnedUsdmAssetId: null,
    peerUri: null,
    channelWaitTimeoutMs: 50,
    channelPollIntervalMs: 1,
    wait: async () => undefined,
    ...overrides,
  });
  return { gateway, authenticate };
}

async function openedGateway(client: RlnRestClient, overrides: Partial<RemoteRlnGatewayDependencies> = {}) {
  const built = gatewayWith(client, overrides);
  await built.gateway.openWallet(REMOTE_WALLET_ID, () => undefined);
  return built;
}

describe('remote RLN wallet gateway', () => {
  test('exposes the node as the single wallet, named on creation', async () => {
    const { gateway } = gatewayWith(fakeClient());
    await expect(gateway.hasStoredWallet()).resolves.toBe(true);
    const created = await gateway.createWallet('  Alice phone  ');
    expect(created).toMatchObject({ id: REMOTE_WALLET_ID, name: 'Alice phone' });
    await expect(gateway.listWallets()).resolves.toEqual([created]);
  });

  test('requires biometric authentication before touching the node', async () => {
    const client = fakeClient();
    const order: string[] = [];
    const { gateway } = gatewayWith(client, {
      authenticate: async () => {
        order.push('authenticate');
      },
      createClient: async () => {
        order.push('createClient');
        return client;
      },
    });
    await gateway.openWallet(REMOTE_WALLET_ID, () => undefined);
    expect(order).toEqual(['authenticate', 'createClient']);
  });

  test('a failed authentication never reaches the node', async () => {
    const createClient = jest.fn(async () => fakeClient());
    const { gateway } = gatewayWith(fakeClient(), {
      authenticate: async () => {
        throw new Error('cancelled');
      },
      createClient,
    });
    await expect(gateway.openWallet(REMOTE_WALLET_ID, () => undefined)).rejects.toThrow('cancelled');
    expect(createClient).not.toHaveBeenCalled();
  });

  test('reports the setup steps in order and connects the peer when configured', async () => {
    const client = fakeClient();
    const steps: string[] = [];
    const { gateway } = gatewayWith(client, { peerUri: `${PEER_PUBKEY}@127.0.0.1:9735` });
    await gateway.openWallet(REMOTE_WALLET_ID, (step) => steps.push(step));
    expect(steps).toEqual(['opening-node', 'connecting-lsp', 'provisioning-channel', 'ready']);
    expect(client.connectPeer).toHaveBeenCalledWith(`${PEER_PUBKEY}@127.0.0.1:9735`);
  });

  test('a fresh, unopened session reports nothing', async () => {
    const { gateway } = gatewayWith(fakeClient());
    await expect(gateway.readStatus()).resolves.toEqual({
      nodePubkey: null,
      btcSpendableSat: 0,
      balanceUsdmBaseUnits: null,
      channelReady: false,
    });
  });

  test('the USDm balance is what is spendable over Lightning', async () => {
    const { gateway } = await openedGateway(fakeClient());
    await expect(gateway.readStatus()).resolves.toMatchObject({
      btcSpendableSat: 99_000,
      balanceUsdmBaseUnits: 40_100,
      channelReady: true,
    });
  });

  test('a channel for another asset does not count as USDm-ready', async () => {
    const client = fakeClient({
      listChannels: jest.fn(async () => [{ ...usableUsdmChannel(), asset_id: 'rgb:other' }]),
    });
    const { gateway } = await openedGateway(client);
    await expect(gateway.readStatus()).resolves.toMatchObject({ channelReady: false });
  });

  test('a pinned asset id skips the ticker lookup', async () => {
    const client = fakeClient();
    await openedGateway(client, { pinnedUsdmAssetId: USDM });
    expect(client.findNiaAssetIdByTicker).not.toHaveBeenCalled();
  });

  test('a non-bolt11 proposal never reaches sendPayment', async () => {
    const client = fakeClient();
    const { gateway } = await openedGateway(client);
    await expect(gateway.submitPayment({ invoice: 'rgb:not-a-lightning-invoice' })).rejects.toMatchObject({
      name: 'PaymentValidationError',
    });
    expect(client.sendPayment).not.toHaveBeenCalled();
  });

  test('a relayed invoice for another amount never reaches sendPayment', async () => {
    const client = fakeClient();
    const { gateway } = await openedGateway(client);
    await expect(
      gateway.submitPayment({
        invoice: 'lnbcrt1validdemo',
        expected: { payeePubkey: PEER_PUBKEY, assetAmountBaseUnits: 5_000_000_000 },
      }),
    ).rejects.toMatchObject({ name: 'PaymentValidationError' });
    expect(client.sendPayment).not.toHaveBeenCalled();
  });

  test('a relayed invoice for another payee never reaches sendPayment', async () => {
    const client = fakeClient();
    const { gateway } = await openedGateway(client);
    await expect(
      gateway.submitPayment({
        invoice: 'lnbcrt1validdemo',
        expected: {
          payeePubkey: `02${'c'.repeat(64)}`,
          assetAmountBaseUnits: 2_000_000_000,
        },
      }),
    ).rejects.toMatchObject({ name: 'PaymentValidationError' });
    expect(client.sendPayment).not.toHaveBeenCalled();
  });

  test('the reviewed invoice is the only one paid', async () => {
    const client = fakeClient();
    const { gateway } = await openedGateway(client);
    await expect(
      gateway.submitPayment({
        invoice: 'lnbcrt1validdemo',
        expected: { payeePubkey: PEER_PUBKEY, assetAmountBaseUnits: 2_000_000_000 },
      }),
    ).resolves.toMatchObject({ paymentHash: 'e'.repeat(64) });
    expect(client.sendPayment).toHaveBeenCalledWith('lnbcrt1validdemo');
  });

  test('payment status comes from the node payment list, never guessed', async () => {
    const hash = 'e'.repeat(64);
    const client = fakeClient({
      listPayments: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { payment_hash: hash, payment_type: 'Outbound', status: 'Succeeded', created_at: 1 },
        ]),
    });
    const { gateway } = await openedGateway(client);
    await expect(gateway.checkPayment(hash)).resolves.toBe('unknown');
    await expect(gateway.checkPayment(hash)).resolves.toBe('settled');
  });

  test('a USDm invoice carries the node HTLC minimum and returns its payment hash', async () => {
    const client = fakeClient();
    const { gateway } = await openedGateway(client);
    await expect(gateway.createUsdmInvoice(100_000_000)).resolves.toEqual({
      invoice: 'lnbcrt1invoice',
      paymentHash: 'f'.repeat(64),
    });
    expect(client.createLnInvoice).toHaveBeenCalledWith({
      amtMsat: 3_000_000,
      expirySec: 3600,
      assetId: USDM,
      assetAmount: 100_000_000,
    });
  });

  test('transfers map the fungible assignment amount', async () => {
    const client = fakeClient({
      listTransfers: jest.fn(async () => [
        { idx: 7, status: 'Settled', kind: 'ReceiveWitness', assignments: [{ type: 'Fungible', value: 250 }] },
      ]),
    });
    const { gateway } = await openedGateway(client);
    await expect(gateway.refreshTransfers()).resolves.toEqual([
      { transferId: '7', kind: 'ReceiveWitness', status: 'Settled', amount: 250 },
    ]);
    expect(client.refreshTransfers).toHaveBeenCalled();
  });

  test('shutdown releases the session without stopping the remote node', async () => {
    const { gateway } = await openedGateway(fakeClient());
    await gateway.shutdown();
    await expect(gateway.readStatus()).resolves.toMatchObject({ nodePubkey: null });
  });
});
