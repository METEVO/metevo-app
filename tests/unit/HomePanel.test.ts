import { HomePanelState, pickHomePanel } from '../../src/utils/homePanel';

const idleOnline: HomePanelState = {
  walletOpen: true,
  taskOpen: false,
  nodeOffline: false,
  errorMessage: null,
  connecting: false,
  channelProvisioning: false,
};

describe('pickHomePanel', () => {
  it('shows the idle menu when the wallet is online and no card is open', () => {
    expect(pickHomePanel(idleOnline)).toBe('task');
  });

  it('replaces the idle menu with the offline panel', () => {
    expect(pickHomePanel({ ...idleOnline, nodeOffline: true })).toBe('offline');
  });

  it('keeps an open card on screen while the node is offline', () => {
    expect(pickHomePanel({ ...idleOnline, taskOpen: true, nodeOffline: true })).toBe('task');
  });

  it('keeps an open card on screen while the wallet reconnects', () => {
    expect(pickHomePanel({ ...idleOnline, taskOpen: true, connecting: true })).toBe('task');
  });

  it('shows the connection panels before any wallet is open, even with a pending card', () => {
    const closed = { ...idleOnline, walletOpen: false, taskOpen: true };
    expect(pickHomePanel({ ...closed, connecting: true })).toBe('connecting');
    expect(pickHomePanel({ ...closed, errorMessage: 'no node' })).toBe('error');
  });

  it('shows channel provisioning instead of the idle menu', () => {
    expect(pickHomePanel({ ...idleOnline, channelProvisioning: true })).toBe('provisioning');
  });
});
