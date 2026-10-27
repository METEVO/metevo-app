import React from 'react';
import { Text, View } from 'react-native';

import { IntentId } from '../../types/intents';
import { ContactsPanel } from '../contacts/ContactsPanel';
import {
  MetevoTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { ReadBalanceCard } from './ReadBalanceCard';
import { ReadSpendingOverviewCard } from './ReadSpendingOverviewCard';
import { ReadTransactionsCard } from './ReadTransactionsCard';
import { ReceiveRequestCard } from './ReceiveRequestCard';
import { SendBtcCard } from './SendBtcCard';
import { SendPaymentCard } from './SendPaymentCard';
import { IntentCardShell } from './IntentCardShell';

const IDLE_TITLE = 'Ready when you are';

/** The design's idle menu: one full-width action per row. */
const IDLE_ACTIONS: { id: IntentId; label: string }[] = [
  { id: 'send-usdm', label: 'Send money' },
  { id: 'create-usdm-invoice', label: 'Receive money' },
  { id: 'contacts', label: 'Contacts' },
];

export interface IntentCardProps {
  /** Clears the canvas back to the idle menu (panels call it on Done). */
  onClearIntent?: () => void;
  /** Starts an intent from the idle menu. */
  onSelectIntent?: (intent: IntentId) => void;
  /** The voice pipeline's structured answer for this intent (untyped:
   * each card validates its own shape). */
  payload?: unknown;
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

/** The design's HOME-01 panel: title plus the three quick actions. */
function IdleMenu({ onSelectIntent }: IntentCardProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.menu}>
      <Text style={styles.title}>{IDLE_TITLE}</Text>
      <View style={styles.actions}>
        {IDLE_ACTIONS.map((action) => (
          <ActionButton
            key={action.id}
            label={action.label}
            variant="outlined"
            onPress={() => onSelectIntent?.(action.id)}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Picks the card matching the current task content (null = idle menu).
 * Adding one: extend `IntentId`, add a card file, register it here.
 * The voice payload rides along; each card validates its own shape.
 */
export function IntentCard({
  id,
  onClearIntent,
  onSelectIntent,
  payload,
}: {
  id: IntentId | null;
  onClearIntent?: () => void;
  onSelectIntent?: (intent: IntentId) => void;
  payload?: unknown;
}) {
  const ActiveCard = id === null ? null : CARDS[id];

  if (!ActiveCard) {
    return <IdleMenu onSelectIntent={onSelectIntent} />;
  }

  return (
    <ActiveCard
      onClearIntent={onClearIntent}
      onSelectIntent={onSelectIntent}
      payload={payload}
    />
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  menu: {
    flex: 1,
    gap: layout.rowGap,
  },
  title: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  actions: {
    gap: layout.rowGap,
  },
});
