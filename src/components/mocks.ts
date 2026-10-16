/** Shape of one mocked transaction row. TODO(phase 2): real wallet history. */
export interface MockTransaction {
  id: string;
  title: string;
  detail: string;
  amount: string;
}

/** Mocked "last transactions" for the foundation wireframe. */
export const MOCK_TRANSACTIONS: MockTransaction[] = [
  { id: 'tx-1', title: 'Maria W.', detail: 'You sent 5 USDm', amount: '-5.00 USDm' },
  { id: 'tx-2', title: 'Kampala Market', detail: 'You received 12 USDm', amount: '+12.00 USDm' },
  { id: 'tx-3', title: 'Top-up', detail: 'You received 500 sats', amount: '+500 sats' },
];
