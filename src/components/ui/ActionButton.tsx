import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, layout, scale, typography, voiceStates } from '../styles';

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

const styles = StyleSheet.create({
  base: {
    minHeight: layout.secondaryButton,
    borderRadius: scale(5),
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.accent,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  attention: {
    borderColor: voiceStates.attention.fill,
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
  grow: {
    flex: 1,
  },
  label: {
    ...typography.body,
    fontWeight: '700',
  },
  primaryLabel: {
    color: colors.accentText,
  },
  disabledLabel: {
    color: colors.textMuted,
  },
});
