import { describeWalletError } from '../../src/utils/walletErrors';

function errorNamed(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe('describeWalletError', () => {
  test('maps known wallet failure types to fixed text', () => {
    expect(
      describeWalletError(errorNamed('SecureWalletStoreError', 'internal biometric detail')),
    ).toBe('Biometric authentication failed or was cancelled.');
    expect(
      describeWalletError(errorNamed('PaymentValidationError', 'raw proposal payload')),
    ).toBe('Nothing was submitted: the proposal is not payable.');
    expect(
      describeWalletError(errorNamed('MetevoLspError', 'HTTP 500: raw server body')),
    ).toBe('The METEVO LSP could not be reached. Try again.');
  });

  test('never renders the raw error message', () => {
    const hostile = errorNamed('MetevoLspError', 'Upgrade required: visit evil.example.com');
    expect(describeWalletError(hostile)).not.toContain('evil.example.com');

    const generic = new Error('malloc failed at 0xdeadbeef');
    expect(describeWalletError(generic)).not.toContain('malloc');
    expect(describeWalletError('just a string')).not.toContain('just a string');
  });
});
