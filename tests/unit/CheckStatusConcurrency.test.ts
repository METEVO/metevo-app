import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
const mockCheck = jest.fn();
const mockWatch = jest.fn(async () => ({ status: 'unknown' }));
const mockJournal = jest.fn(async (..._args: unknown[]) => {});
jest.mock('../../src/hooks/useWalletSession', () => ({ useWalletSession: () => ({
  wallet: { nodePubkey: 'wallet', balanceUsdmBaseUnits: 10000000000 },
  submitPayment: async () => ({ paymentHash: 'ABCD' }),
  checkPayment: mockCheck,
}) }));
jest.mock('../../src/hooks/useTransferWatcher', () => ({ useTransferWatcher: () => ({ watchPayment: mockWatch }) }));
jest.mock('../../src/services/metevo/paymentJournal', () => ({ recordSettledPayment: (...args: unknown[]) => mockJournal(...args) }));
jest.mock('../../src/services/metevo/contacts', () => ({ findContactByName: jest.fn(), isValidNodePubkey: jest.fn() }));
jest.mock('../../src/services/metevo/relayClient', () => ({ loadRelayClient: jest.fn() }));
jest.mock('../../src/services/metevo/tacton', () => ({ playTacton: jest.fn() }));
jest.mock('../../src/utils/speaker', () => ({ speakEnglish: jest.fn(), announceForAccessibility: jest.fn() }));
jest.mock('../../src/services/metevo/secure-store', () => ({ hasDeviceLock: async () => false }));
jest.mock('../../src/services/metevo/invoiceRelay', () => ({
  createMockInvoiceRelay: () => ({
    requestInvoice: async () => ({ requestId: 'request' }),
    pollResponse: async () => ({ status: 'delivered', invoice: 'lntb1test', requestId: 'request' }),
  }),
}));
import { usePaymentFlow } from '../../src/hooks/usePaymentFlow';
let flow!: ReturnType<typeof usePaymentFlow>;
function Harness() { flow = usePaymentFlow(); return null; }
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

test('two Check status taps query once and journal once', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Harness)); });
  await act(async () => { await flow.start({ type: 'PAYMENT', recipient: 'Bob', amount: 1, asset: 'USDm' } as never); });
  expect(flow.stage).toBe('review');
  await act(async () => { await flow.confirm(); });
  expect(flow.stage).toBe('unknown');
  let settle!: (value: string) => void;
  mockCheck.mockImplementationOnce(() => new Promise((resolve) => { settle = resolve; }));
  let first!: Promise<void>;
  await act(async () => { first = flow.checkStatus(); await flow.checkStatus(); });
  expect(mockCheck).toHaveBeenCalledTimes(1);
  await act(async () => { settle('settled'); await first; });
  expect(mockJournal).toHaveBeenCalledTimes(1);
  await act(async () => { tree.unmount(); });
});
