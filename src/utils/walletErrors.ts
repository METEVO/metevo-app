/**
 * Maps wallet failures to fixed, user-facing text.
 *
 * Raw error bodies (network responses, native module messages) must never
 * reach the UI or the spoken seam: they are attacker-influenceable and
 * would turn the error screen into a social-engineering surface. Callers
 * log the error type for debugging instead of rendering it.
 */
export function describeWalletError(cause: unknown): string {
  const name = cause instanceof Error ? cause.name : '';
  switch (name) {
    case 'SecureWalletStoreError':
      return 'Biometric authentication failed or was cancelled.';
    case 'PaymentValidationError':
      return 'Nothing was submitted: the proposal is not payable.';
    case 'MetevoLspError':
      return 'The METEVO LSP could not be reached. Try again.';
    default:
      return 'Something went wrong. Try again.';
  }
}
