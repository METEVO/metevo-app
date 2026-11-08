import React from 'react';
import { Text, View } from 'react-native';

import { ENV } from '../../config/env';
import { useThemedStyles } from '../../design/ThemeContext';
import { useWalletSession } from '../../hooks/useWalletSession';
import { ActionButton } from '../ui/ActionButton';
import type { IntentCardProps } from './IntentCard';
import { makeSummaryCardStyles } from './summaryCardStyles';

const DEMO_NOTE = 'Demo mode: no real money moves.';

function shortenPubkey(pubkey: string): string {
  return `${pubkey.slice(0, 8)}…${pubkey.slice(-6)}`;
}

/** Profile: which wallet this phone uses and whether its money is real. */
export function ProfileCard({ onClearIntent }: IntentCardProps) {
  const styles = useThemedStyles(makeSummaryCardStyles);
  const { wallet } = useWalletSession();
  const demo = ENV.EXPO_PUBLIC_WALLET_MODE === 'mock';
  const nodePubkey = wallet?.nodePubkey ?? null;

  return (
    <View style={styles.panel}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Wallet</Text>
          <Text style={styles.value}>{demo ? 'Demo' : 'Real'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Node key</Text>
          <Text style={styles.value} accessibilityLabel={nodePubkey ?? 'Not connected'}>
            {nodePubkey === null ? 'Not connected' : shortenPubkey(nodePubkey)}
          </Text>
        </View>
        {demo && <Text style={styles.caption}>{DEMO_NOTE}</Text>}
      </View>
      <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
    </View>
  );
}
