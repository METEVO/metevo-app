import {
  createMockLocalLink,
  localLinkFetchInvoiceProtocol,
} from '../../src/services/localelink/mockLocalLink';

describe('mock local link (Expo Go / Jest stand-in)', () => {
  test('serves the invoice to the payer over the simulated socket', async () => {
    const link = createMockLocalLink();
    await link.startTagEmulation({ ssid: 'DIRECT-metevo', password: 'secret', sessionId: 's-1' });
    const group = await link.startGroup(48_444);
    expect(group.ownerAddress).toBe('192.168.49.1');

    await link.serveInvoice({ sessionId: 's-1', invoice: 'lntb1mockinvoice' });

    await link.connectToGroup('DIRECT-metevo', 'secret', 1_000);
    const invoice = await link.fetchInvoice({
      host: group.ownerAddress,
      port: group.port,
      sessionId: 's-1',
      timeoutMs: 1_000,
    });
    expect(invoice).toBe('lntb1mockinvoice');
  });

  test('connect fails safely on mismatched credentials', async () => {
    const link = createMockLocalLink();
    await link.startTagEmulation({ ssid: 'DIRECT-metevo', password: 'secret', sessionId: 's-1' });
    await link.startGroup(48_444);
    await expect(link.connectToGroup('DIRECT-other', 'secret', 1)).rejects.toThrow(/do not match/);
  });

  test('fetch fails safely on an unknown session', async () => {
    const link = createMockLocalLink();
    await link.startTagEmulation({ ssid: 'DIRECT-metevo', password: 'secret', sessionId: 's-1' });
    await link.startGroup(48_444);
    await expect(
      link.fetchInvoice({ host: '192.168.49.1', port: 48444, sessionId: 'missing', timeoutMs: 1 }),
    ).rejects.toThrow(/unknown session/);
  });

  test('stopGroup tears down and is idempotent', async () => {
    const link = createMockLocalLink();
    await link.startTagEmulation({ ssid: 'DIRECT-metevo', password: 'secret', sessionId: 's-1' });
    const group = await link.startGroup(48_444);
    await link.serveInvoice({ sessionId: 's-1', invoice: 'lntb1mockinvoice' });
    await link.stopGroup();
    await link.stopGroup();
    // After teardown the served invoice is gone: a payer join fails closed.
    await expect(
      link.fetchInvoice({ host: group.ownerAddress, port: group.port, sessionId: 's-1', timeoutMs: 1 }),
    ).rejects.toThrow(/not running/);
    await expect(link.connectToGroup('DIRECT-metevo', 'secret', 1)).rejects.toThrow(/not running/);
    expect(link.isRunning()).toBe(false);
  });

  test('fetch fails closed after stopGroup on a still-running fetch', async () => {
    const link = createMockLocalLink();
    await link.startTagEmulation({ ssid: 'DIRECT-metevo', password: 'secret', sessionId: 's-1' });
    const group = await link.startGroup(48_444);
    await link.serveInvoice({ sessionId: 's-1', invoice: 'lntb1mockinvoice' });
    const pending = link.fetchInvoice({
      host: group.ownerAddress,
      port: group.port,
      sessionId: 's-1',
      timeoutMs: 5_000,
    });
    await link.stopGroup();
    await expect(pending).rejects.toThrow(/teardown|closed/);
  });
});

describe('local link socket protocol', () => {
  test('request line format and response parsing', () => {
    expect(localLinkFetchInvoiceProtocol.requestLine('session-abc')).toBe(
      'fetch session-abc\n',
    );
    expect(
      localLinkFetchInvoiceProtocol.parseResponse('lntb1invoice-from-receiver\n'),
    ).toEqual({ invoice: 'lntb1invoice-from-receiver' });
    expect(localLinkFetchInvoiceProtocol.parseResponse('error unknown session\n')).toEqual({
      error: 'unknown session',
    });
    expect(() => localLinkFetchInvoiceProtocol.parseResponse('')).toThrow(/empty/);
  });
});
