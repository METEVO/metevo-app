import React, { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { metevoDesignTokens } from '../design/designTokens';
import {
  MetevoTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { layout, scale } from './styles';

export type TaskPanelVariant = 'idle' | 'attention';

interface TaskPanelProps {
  children: ReactNode;
  /** idle = the design's soft green task card, attention = the error card. */
  variant?: TaskPanelVariant;
}

/**
 * The design's fixed task card (reference 206 x 181): every intent card and
 * the idle menu render inside it. The card never grows past its reference
 * height, so the microphone anchor below it never moves; a card with more
 * content scrolls instead.
 */
export function TaskPanel({ children, variant = 'idle' }: TaskPanelProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.panel, variant === 'attention' && styles.attention]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  panel: {
    height: scale(metevoDesignTokens.layout.taskCanvas.height),
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    borderWidth: 1,
    borderColor: theme.voiceStates.idle.ink,
    backgroundColor: theme.voiceStates.idle.soft,
    paddingHorizontal: scale(PANEL_INSET),
    paddingVertical: scale(PANEL_INSET),
  },
  attention: {
    borderColor: theme.voiceStates.attention.ink,
    backgroundColor: theme.voiceStates.attention.soft,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: layout.rowGap,
  },
});

/** tokens.layout.contentInset 25.4 minus the screen inset 15.4. */
const PANEL_INSET = 10;
