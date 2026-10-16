import React from 'react';

import { IntentId } from '../../types/intents';
import { CreateRgbInvoiceCard } from './CreateRgbInvoiceCard';
import { ReadBalanceCard } from './ReadBalanceCard';
import { ReadSpendingOverviewCard } from './ReadSpendingOverviewCard';
import { ReadTransactionsCard } from './ReadTransactionsCard';
import { SendBtcCard } from './SendBtcCard';
import { SendRgbCard } from './SendRgbCard';
import { IntentCardShell } from './IntentCardShell';

const IDLE_TITLE = 'NO ACTIVE INTENT';
const IDLE_MESSAGE =
  'Say a command like "send five dollars to Maria". (Foundation mockup: voice is not connected yet.)';

/** All known cards, registered by intent id. */
const CARDS: Record<IntentId, React.ComponentType> = {
  'send-usdm': SendRgbCard,
  'send-btc': SendBtcCard,
  'create-usdm-invoice': CreateRgbInvoiceCard,
  'read-transactions': ReadTransactionsCard,
  'read-spending-overview': ReadSpendingOverviewCard,
  'read-balance': ReadBalanceCard,
};

/**
 * Picks the card matching the current intent (null = idle hint).
 * Adding an intent: extend `IntentId`, add a card file, register it here.
 */
export function IntentCard({ id }: { id: IntentId | null }) {
  const ActiveCard = id === null ? null : CARDS[id];

  if (!ActiveCard) {
    return <IntentCardShell title={IDLE_TITLE} message={IDLE_MESSAGE} />;
  }

  return <ActiveCard />;
}
