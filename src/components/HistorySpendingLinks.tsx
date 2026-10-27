import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import HistoryDark from '../assets/history_dark.svg';
import HistoryLight from '../assets/history_light.svg';
import SpendingDark from '../assets/spending_dark.svg';
import SpendingLight from '../assets/spending_light.svg';
import { metevoDesignTokens } from '../design/designTokens';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { layout, scale } from './styles';

/** Intrinsic reference size shared by the bottom action asset viewBoxes. */
const ACTION_ICON_REFERENCE = { width: 16, height: 17 } as const;

const LINKS = [
  { label: 'History', Dark: HistoryDark, Light: HistoryLight },
  { label: 'Spending', Dark: SpendingDark, Light: SpendingLight },
] as const;

/**
 * Bottom "History" and "Spending" shell controls of the design (paired
 * half-width outlined buttons).
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
            accessibilityLabel={label}
          >
            <View style={styles.icon} pointerEvents="none">
              <Icon
                width={scale(ACTION_ICON_REFERENCE.width)}
                height={scale(ACTION_ICON_REFERENCE.height)}
              />
            </View>
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
    gap: scale(6),
  },
  link: {
    flex: 1,
    minHeight: layout.secondaryButton,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.background,
  },
  /** The reference pins the icon left and centers the label in the button. */
  icon: {
    position: 'absolute' as const,
    left: scale(8),
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
  },
  label: theme.typography.body,
});
