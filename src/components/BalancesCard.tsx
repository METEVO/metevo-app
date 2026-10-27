import React from 'react';
import { Text, View } from 'react-native';

import { metevoDesignTokens } from '../design/designTokens';
import {
  MetevoTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { scale } from './styles';

interface BalancesCardProps {
  /** "Available balance" online, "Last known balance" offline. */
  label: string;
  /** Formatted USDm amount ("460.00 USDm" or "— USDm"). */
  usdm: string;
  /** Formatted spendable sats ("99,678,917 sats"). */
  sats: string;
}

/**
 * The design's single top balance box (reference 206 x 43): a muted label,
 * the USDm amount in the title size, then the sats balance on the same row.
 * Purely presentational; values come from the wallet session.
 */
export function BalancesCard({ label, usdm, sats }: BalancesCardProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.values}>
        <Text style={styles.usdm}>{usdm}</Text>
        <Text style={styles.sats}>{sats}</Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
    gap: scale(2),
  },
  label: theme.typography.caption,
  values: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: scale(8),
  },
  usdm: theme.typography.title,
  sats: theme.typography.caption,
});
