import {
  payOverDirectChannel,
  planPaymentRoute,
} from '../../src/services/metevo/offlineChannel';

describe('planPaymentRoute', () => {
  const hint = { nodePubkey: '02aa', ldkPort: 9735 };

  test('prefers the direct channel in person when one exists with the peer', () => {
    const plan = planPaymentRoute({
      directHint: hint,
      hasUsableChannelWithPeer: true,
      preferDirect: true,
    });
    expect(plan.route).toBe('direct');
    expect(plan.reason).toMatch(/direct channel/);
  });

  test('falls back to the LSP without a usable channel with the peer', () => {
    const plan = planPaymentRoute({
      directHint: hint,
      hasUsableChannelWithPeer: false,
      preferDirect: true,
    });
    expect(plan.route).toBe('lsp');
    expect(plan.reason).toMatch(/direct channel/i);
  });

  test('falls back to the LSP when the receiver serves no direct hint', () => {
    const plan = planPaymentRoute({
      directHint: null,
      hasUsableChannelWithPeer: true,
      preferDirect: true,
    });
    expect(plan.route).toBe('lsp');
  });

  test('never routes direct when the flow is remote (LSP mode)', () => {
    const plan = planPaymentRoute({
      directHint: hint,
      hasUsableChannelWithPeer: true,
      preferDirect: false,
    });
    expect(plan.route).toBe('lsp');
  });
});

describe('payOverDirectChannel', () => {
  const ops = {
    connectPeer: jest.fn().mockResolvedValue(undefined),
    payInvoice: jest.fn().mockResolvedValue({ paymentHash: 'f'.repeat(64) }),
  };

  test('connects the LDK peer over the group and pays the invoice', async () => {
    const result = await payOverDirectChannel(ops, {
      host: '192.168.49.1',
      nodePubkey: '02aa',
      ldkPort: 9735,
      invoice: 'lntb1directinvoice',
    });

    expect(result.paymentHash).toBe('f'.repeat(64));
    expect(ops.connectPeer).toHaveBeenCalledWith('02aa@192.168.49.1:9735');
    expect(ops.payInvoice).toHaveBeenCalledWith('lntb1directinvoice');
    // Order matters: the peer session must exist before the HTLC update.
    expect(ops.connectPeer.mock.invocationCallOrder[0]).toBeLessThan(
      ops.payInvoice.mock.invocationCallOrder[0],
    );
  });

  test('propagates a connect failure without attempting the payment', async () => {
    const failing = {
      connectPeer: jest.fn().mockRejectedValue(new Error('peer unreachable')),
      payInvoice: jest.fn(),
    };
    await expect(
      payOverDirectChannel(failing, {
        host: '192.168.49.1',
        nodePubkey: '02aa',
        ldkPort: 9735,
        invoice: 'lntb1directinvoice',
      }),
    ).rejects.toThrow(/peer unreachable/);
    expect(failing.payInvoice).not.toHaveBeenCalled();
  });
});
