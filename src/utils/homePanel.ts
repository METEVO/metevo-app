/** What the Home's central panel shows. */
export type HomePanel = 'offline' | 'error' | 'connecting' | 'provisioning' | 'task';

export interface HomePanelState {
  walletOpen: boolean;
  /** A card is open (a payment, a request, contacts…). */
  taskOpen: boolean;
  nodeOffline: boolean;
  errorMessage: string | null;
  connecting: boolean;
  channelProvisioning: boolean;
}

/**
 * An open card stays on screen while the node is unreachable: unmounting it
 * would hide a payment already sent, and reopening it would ask the
 * recipient for a second invoice. The status panels only replace the idle
 * menu.
 */
export function pickHomePanel(state: HomePanelState): HomePanel {
  if (state.walletOpen && state.taskOpen) return 'task';
  if (state.nodeOffline) return 'offline';
  if (state.errorMessage !== null) return 'error';
  if (state.connecting) return 'connecting';
  if (state.channelProvisioning) return 'provisioning';
  return 'task';
}
