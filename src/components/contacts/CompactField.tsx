import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';

import { useTheme, useThemedStyles, type MetevoTheme } from '../../design/ThemeContext';
import { layout } from '../styles';

interface CompactFieldProps {
  /** Shown inside the empty field and read by screen readers. */
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  editable?: boolean;
  maxLength?: number;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}

/** One-line input for forms inside the fixed task panel, where a separate
 * label row per field would push the actions out of sight. */
export function CompactField({
  label, value, onChangeText, editable = true, maxLength, keyboardType = 'default',
}: CompactFieldProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TextInput
      style={styles.input}
      placeholder={label}
      placeholderTextColor={theme.colors.textMuted}
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      maxLength={maxLength}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === 'default' ? 'sentences' : 'none'}
      autoCorrect={false}
    />
  );
}

export function TextLink({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[styles.link, disabled && styles.disabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  input: {
    ...theme.typography.body,
    ...theme.cardBase,
    color: theme.colors.text,
    paddingHorizontal: layout.rowGap,
    paddingVertical: layout.rowGap / 2,
  },
  link: {
    ...theme.typography.caption,
    color: theme.colors.text,
    textDecorationLine: 'underline' as const,
  },
  disabled: { opacity: 0.5 },
});
