import React from 'react';
import { Text, View } from 'react-native';

import { ENV } from '../../config/env';
import { useThemedStyles } from '../../design/ThemeContext';
import { useWalletSession } from '../../hooks/useWalletSession';
import { formatSats, formatUsdmBalance } from '../../utils/balanceFormat';
import { ActionButton } from '../ui/ActionButton';
import type { IntentCardProps } from './IntentCard';
import { makeSummaryCardStyles } from './summaryCardStyles';

const DEMO_NOTE = 'Demo mode: no real money moves.';
const OFFLINE_NOTE = 'The wallet is offline: these are the last known balances.';
const NOT_CONNECTED_NOTE = 'The wallet is not connected yet.';

/**
 * Balance details: what the wallet holds and whether USDm can move yet.
 * The spoken answer is composed separately from the same live values
 * (voice/replies.ts); this card only shows them.
 */
export function ReadBalanceCard({ onClearIntent }: IntentCardProps) {
  const styles = useThemedStyles(makeSummaryCardStyles);
  const { wallet, connection } = useWalletSession();
  const demo = ENV.EXPO_PUBLIC_WALLET_MODE === 'mock';
  const usdm = formatUsdmBalance(wallet?.balanceUsdmBaseUnits ?? null);
  const sats = formatSats(wallet?.btcSpendableSat ?? null);
  const channel =
    wallet === null ? 'Not connected' : wallet.channelReady ? 'Ready' : 'Opening…';

  return (
    <View style={styles.panel}>
      <View style={styles.content}>
        <Text style={styles.title}>Balances</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Dollars (USDm)</Text>
          <Text style={styles.value}>{usdm}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Bitcoin</Text>
          <Text style={styles.value}>{sats}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>USDm channel</Text>
          <Text style={styles.value}>{channel}</Text>
        </View>
        {wallet === null && <Text style={styles.caption}>{NOT_CONNECTED_NOTE}</Text>}
        {wallet !== null && connection === 'offline' && (
          <Text style={styles.caption}>{OFFLINE_NOTE}</Text>
        )}
        {demo && <Text style={styles.caption}>{DEMO_NOTE}</Text>}
      </View>
      <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
    </View>
  );
}
