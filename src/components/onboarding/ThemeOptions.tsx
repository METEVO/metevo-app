import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { metevoDesignTokens } from '../../design/designTokens';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { UiTheme } from '../../hooks/useWalletSession';
import { speakAnnouncement } from '../../services/spokenInteraction';
import { layout } from '../styles';
import { OnboardingFrame } from './OnboardingFrame';

interface ThemeOptionsProps {
  selected: UiTheme;
  onSelect: (theme: UiTheme) => void;
  onContinue: () => void;
}

/**
 * Design section 27: theme selection with a palette preview per option and
 * an explicit confirmation. Selecting applies the preference immediately,
 * so the whole screen previews the candidate palette live (design rule:
 * preview text, surfaces, outlines and symbols while preserving geometry);
 * Continue accepts what is already on screen.
 */
export function ThemeOptions({ selected, onSelect, onContinue }: ThemeOptionsProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  function selectTheme(candidate: UiTheme) {
    onSelect(candidate);
    speakAnnouncement(`${candidate} theme selected.`);
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
      <Text style={theme.typography.caption}>{selected} theme selected.</Text>
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
  const appTheme = useTheme();
  const styles = useThemedStyles(makeStyles);
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
      <Text style={appTheme.typography.body}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  previewRow: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
  previewCard: {
    ...theme.cardBase,
    flex: 1,
    alignItems: 'center' as const,
    gap: layout.rowGap,
  },
  previewSelected: {
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  swatchBackground: {
    width: '100%' as const,
    aspectRatio: 2,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  swatchSurface: {
    width: '60%' as const,
    aspectRatio: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  swatchAccent: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
