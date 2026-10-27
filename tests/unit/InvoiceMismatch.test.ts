import {
  describeInvoiceMismatch,
  type DecodedInvoiceView,
} from '../../src/services/metevo/paymentGuard';

const PAYEE = `02${'ab'.repeat(32)}`;
const ASSET = 'rgb:JxkjYIRK-W8ZS6NJ-4ePZg_1-X2Bhyzb-QICQsahd-NUEAHa8';

function decoded(overrides: Partial<DecodedInvoiceView> = {}): DecodedInvoiceView {
  return {
    payeePubkey: PAYEE,
    assetId: ASSET,
    assetAmount: 2_000_000_000,
    ...overrides,
  };
}

const reviewed = { payeePubkey: PAYEE, assetAmountBaseUnits: 2_000_000_000 };

describe('payment boundary: a relayed invoice must match the reviewed payment', () => {
  test('accepts the reviewed invoice', () => {
    expect(describeInvoiceMismatch(decoded(), reviewed, ASSET)).toBeNull();
  });

  test('accepts an uppercase payee and an unknown expected asset', () => {
    expect(
      describeInvoiceMismatch(decoded({ payeePubkey: PAYEE.toUpperCase() }), reviewed, null),
    ).toBeNull();
  });

  test('rejects another destination', () => {
    expect(
      describeInvoiceMismatch(decoded({ payeePubkey: `03${'cd'.repeat(32)}` }), reviewed, ASSET),
    ).toBe('destination');
  });

  test('rejects another asset and a missing asset', () => {
    expect(
      describeInvoiceMismatch(decoded({ assetId: 'rgb:other-asset' }), reviewed, ASSET),
    ).toBe('asset');
    expect(describeInvoiceMismatch(decoded({ assetId: null }), reviewed, ASSET)).toBe('asset');
  });

  test('rejects another amount and a zero-amount invoice', () => {
    expect(
      describeInvoiceMismatch(decoded({ assetAmount: 50_000_000_000 }), reviewed, ASSET),
    ).toBe('amount');
    expect(describeInvoiceMismatch(decoded({ assetAmount: null }), reviewed, ASSET)).toBe(
      'amount',
    );
  });
});
