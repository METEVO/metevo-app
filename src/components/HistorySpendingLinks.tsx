import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import HistoryDark from '../assets/history_dark.svg';
import HistoryLight from '../assets/history_light.svg';
import SpendingDark from '../assets/spending_dark.svg';
import SpendingLight from '../assets/spending_light.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { layout, scale } from './styles';

/** Intrinsic reference size shared by the bottom action asset viewBoxes. */
const ACTION_ICON_REFERENCE = { width: 16, height: 17 } as const;

const LINKS = [
  { label: 'HISTORY', Dark: HistoryDark, Light: HistoryLight },
  { label: 'SPENDING', Dark: SpendingDark, Light: SpendingLight },
] as const;

/**
 * Bottom "HISTORY" and "SPENDING" shell controls of the design.
 * Non-functional placeholders by design (no navigation in this phase).
 * TODO(phase 2): trigger the read-transactions / read-spending-overview
 * intents directly (voice-first product; these stay as visible shortcuts).
 */
export function HistorySpendingLinks() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.row}>
      {LINKS.map(({ label, Dark, Light }) => {
        const Icon = theme.mode === 'dark' ? Dark : Light;
        return (
          <TouchableOpacity
            key={label}
            style={styles.link}
            onPress={() => undefined}
            accessibilityRole="button"
            accessibilityLabel={label.charAt(0) + label.slice(1).toLowerCase()}
          >
            <Icon
              width={scale(ACTION_ICON_REFERENCE.width)}
              height={scale(ACTION_ICON_REFERENCE.height)}
            />
            <Text style={styles.label}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  row: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
  link: {
    ...theme.cardBase,
    flex: 1,
    minHeight: layout.secondaryButton,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: layout.rowGap,
  },
  label: theme.typography.caption,
});
