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
    case 'WalletConfigError':
      return 'The wallet configuration has not been provisioned on this device.';
    case 'MetevoLspError':
      return 'The METEVO LSP could not be reached. Try again.';
    case 'RlnUnreachableError':
      return 'Your wallet node could not be reached. Check the connection and try again.';
    case 'RlnApiError':
      return (cause as { errorName?: string }).errorName === 'LockedNode'
        ? 'Your wallet node is locked. Unlock it, then try again.'
        : 'Your wallet node rejected the request. Try again.';
    default:
      return 'Something went wrong. Try again.';
  }
}
