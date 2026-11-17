/** Shared shell policy: automatic events wait for the user's current task
 * and voice turn; an invoice gets priority over importing metadata. */
export function pendingHomeEvent(state: {
  walletReady: boolean;
  cardBusy: boolean;
  voiceBusy: boolean;
  hasInvoice: boolean;
  hasContact: boolean;
}): 'invoice-request' | 'import-contact' | null {
  if (!state.walletReady || state.cardBusy || state.voiceBusy) return null;
  if (state.hasInvoice) return 'invoice-request';
  return state.hasContact ? 'import-contact' : null;
}
