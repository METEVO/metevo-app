import React from 'react';

import { IntentId } from '../../types/intents';
import { ContactsPanel } from '../contacts/ContactsPanel';
import { ReadBalanceCard } from './ReadBalanceCard';
import { ReadSpendingOverviewCard } from './ReadSpendingOverviewCard';
import { ReadTransactionsCard } from './ReadTransactionsCard';
import { ReceiveRequestCard } from './ReceiveRequestCard';
import { SendBtcCard } from './SendBtcCard';
import { SendPaymentCard } from './SendPaymentCard';
import { IntentCardShell } from './IntentCardShell';

const IDLE_TITLE = 'Ready when you are';
const IDLE_MESSAGE =
  'Say send, receive or contacts. (Voice recognition arrives with the audio phase.)';

export interface IntentCardProps {
  /** Clears the canvas back to the idle hint (panels call it on Done). */
  onClearIntent?: () => void;
}

/** All known cards, registered by task content id. */
const CARDS: Record<IntentId, React.ComponentType<IntentCardProps>> = {
  'send-usdm': SendPaymentCard,
  'send-btc': SendBtcCard,
  'create-usdm-invoice': ReceiveRequestCard,
  'read-transactions': ReadTransactionsCard,
  'read-spending-overview': ReadSpendingOverviewCard,
  'read-balance': ReadBalanceCard,
  contacts: ContactsPanel,
};

/**
 * Picks the card matching the current task content (null = idle hint).
 * Adding one: extend `IntentId`, add a card file, register it here.
 */
export function IntentCard({ id, onClearIntent }: { id: IntentId | null; onClearIntent?: () => void }) {
  const ActiveCard = id === null ? null : CARDS[id];

  if (!ActiveCard) {
    return <IntentCardShell title={IDLE_TITLE} message={IDLE_MESSAGE} />;
  }

  return <ActiveCard onClearIntent={onClearIntent} />;
}
