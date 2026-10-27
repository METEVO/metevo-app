import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { metevoDesignTokens } from '../../design/designTokens';
import { layout, scale } from '../styles';

export type ActionButtonVariant = 'primary' | 'outlined';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant: ActionButtonVariant;
  /** Marks the recoverable/error action styling (attention state color). */
  attention?: boolean;
  /** Marks the design's selected variant: a strong outline, not a fill. */
  selected?: boolean;
  disabled?: boolean;
  /** Stretch to the row width for paired bottom actions. */
  grow?: boolean;
}

/**
 * The design's ActionButton: primary, outlined, selected and disabled
 * variants with the token-driven touch target. Bottom actions pair one
 * outlined and one primary button in a row.
 */
export function ActionButton({
  label,
  onPress,
  variant,
  attention = false,
  selected = false,
  disabled = false,
  grow = false,
}: ActionButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.outlined,
        attention && styles.attention,
        selected && styles.selected,
        disabled && styles.disabled,
        grow && styles.grow,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.primaryLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  base: {
    minHeight: layout.secondaryButton,
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    paddingHorizontal: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primary: {
    backgroundColor: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.voiceStates.idle.ink,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.background,
  },
  attention: {
    borderColor: theme.voiceStates.attention.ink,
  },
  selected: {
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
  grow: {
    flex: 1,
  },
  label: {
    ...theme.typography.body,
  },
  primaryLabel: {
    color: theme.colors.accentText,
  },
  disabledLabel: {
    color: theme.colors.textMuted,
  },
});
