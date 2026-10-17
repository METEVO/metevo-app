import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { metevoDesignTokens } from '../../design/designTokens';
import { UiTheme } from '../../hooks/useWalletSession';
import { speakAnnouncement } from '../../services/spokenInteraction';
import { cardBase, colors, layout, typography } from '../styles';
import { OnboardingFrame } from './OnboardingFrame';

interface ThemeOptionsProps {
  selected: UiTheme;
  onSelect: (theme: UiTheme) => void;
  onContinue: () => void;
}

/**
 * Design section 27: theme selection with a palette preview per option and
 * an explicit confirmation. The selection is read back before Continue
 * accepts it.
 */
export function ThemeOptions({ selected, onSelect, onContinue }: ThemeOptionsProps) {
  function selectTheme(theme: UiTheme) {
    onSelect(theme);
    speakAnnouncement(`${theme} theme selected.`);
  }

  return (
    <OnboardingFrame
      title="Choose your theme"
      subtitle="Select a theme or say its name."
      hearOptionCount={2}
      onConfirm={onContinue}
    >
      <View style={styles.previewRow}>
        <ThemePreviewCard
          theme="dark"
          selected={selected === 'dark'}
          onSelect={() => selectTheme('dark')}
        />
        <ThemePreviewCard
          theme="light"
          selected={selected === 'light'}
          onSelect={() => selectTheme('light')}
        />
      </View>
      <Text style={typography.caption}>{selected} theme selected.</Text>
    </OnboardingFrame>
  );
}

interface ThemePreviewCardProps {
  theme: UiTheme;
  selected: boolean;
  onSelect: () => void;
}

/** Palette preview from the design tokens: background, surface, accent. */
function ThemePreviewCard({ theme, selected, onSelect }: ThemePreviewCardProps) {
  const palette = metevoDesignTokens[theme];
  const label = theme.charAt(0).toUpperCase() + theme.slice(1);

  return (
    <TouchableOpacity
      style={[styles.previewCard, selected && styles.previewSelected]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`${label} theme`}
      accessibilityState={{ selected }}
    >
      <View style={[styles.swatchBackground, { backgroundColor: palette.background }]}>
        <View
          style={[
            styles.swatchSurface,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <View
            style={[styles.swatchAccent, { backgroundColor: palette.states.idle.fill }]}
          />
        </View>
      </View>
      <Text style={styles.previewLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  previewRow: {
    flexDirection: 'row',
    gap: layout.rowGap,
  },
  previewCard: {
    ...cardBase,
    flex: 1,
    alignItems: 'center',
    gap: layout.rowGap,
  },
  previewSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  swatchBackground: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSurface: {
    width: '60%',
    aspectRatio: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchAccent: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  previewLabel: typography.body,
});
