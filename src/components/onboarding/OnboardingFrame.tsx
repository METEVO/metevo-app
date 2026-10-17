import React, { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  SpokenHighlightListener,
  startSpokenOptionHighlight,
  stopSpokenOptionHighlight,
} from '../../services/spokenInteraction';
import { layout, typography } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { OnboardingVoice } from './OnboardingVoice';

const LISTENING_MESSAGE = 'Listening...';
const LISTENING_HINT = 'Tap the mic to stop.';

interface OnboardingFrameProps {
  title: string;
  subtitle: string;
  /** Task content rendered inside the scrollable canvas. */
  children: ReactNode;
  /** How many options the spoken reading covers (design "Hear options"). */
  hearOptionCount: number;
  /** Receives the index of the option currently spoken; never selects. */
  hearHighlight?: SpokenHighlightListener;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onConfirm?: () => void;
  onBack?: () => void;
}

/**
 * The shared onboarding shell: task canvas with title and scrollable
 * content, the onboarding voice control with its listening state, and the
 * paired bottom actions. Voice recognition and spoken reading stay with
 * the audio phase; this frame only renders their states and seams.
 */
export function OnboardingFrame({
  title,
  subtitle,
  children,
  hearOptionCount,
  hearHighlight,
  confirmLabel = 'Continue',
  confirmDisabled = false,
  onConfirm,
  onBack,
}: OnboardingFrameProps) {
  const [hearing, setHearing] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

  const toggleHearing = useCallback(() => {
    if (hearing) {
      stopSpokenOptionHighlight();
      setHearing(false);
      return;
    }
    startSpokenOptionHighlight(hearOptionCount, hearHighlight ?? (() => undefined));
    setHearing(true);
  }, [hearing, hearOptionCount, hearHighlight]);

  return (
    <View style={styles.fill}>
      {onBack && (
        <ActionButton label="Back" variant="outlined" onPress={onBack} />
      )}
      <Text style={typography.title}>{title}</Text>
      <Text style={typography.body}>{subtitle}</Text>

      <ScrollView contentContainerStyle={styles.canvas}>{children}</ScrollView>

      {voiceListening && (
        <View style={styles.listeningBlock}>
          <Text style={typography.body}>{LISTENING_MESSAGE}</Text>
          <Text style={typography.caption}>{LISTENING_HINT}</Text>
        </View>
      )}

      <OnboardingVoice
        listening={voiceListening}
        onToggle={() => setVoiceListening((current) => !current)}
      />

      <View style={styles.actions}>
        <ActionButton
          label={hearing ? 'Stop reading' : 'Hear options'}
          variant="outlined"
          onPress={toggleHearing}
          grow
        />
        <ActionButton
          label={confirmLabel}
          variant="primary"
          onPress={onConfirm ?? (() => undefined)}
          disabled={confirmDisabled}
          grow
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    gap: layout.rowGap,
  },
  canvas: {
    gap: layout.rowGap,
    flexGrow: 1,
    justifyContent: 'center',
  },
  listeningBlock: {
    alignItems: 'center',
    gap: layout.rowGap / 4,
  },
  actions: {
    flexDirection: 'row',
    gap: layout.rowGap,
  },
});
