import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import IdleVoice from '../../assets/voice_idle_dark.svg';
import ListeningVoice from '../../assets/voice_listening_dark.svg';
import { layout } from '../styles';

interface OnboardingVoiceProps {
  listening: boolean;
  onToggle: () => void;
}

/**
 * The onboarding voice control, rendered with the exact design silhouette:
 * idle shows the microphone and starts a command, listening shows the stop
 * square and stops it. Voice recognition stays with the audio phase; this
 * control only renders and toggles the state.
 */
export function OnboardingVoice({ listening, onToggle }: OnboardingVoiceProps) {
  return (
    <TouchableOpacity
      style={styles.anchor}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Stop talking' : 'Talk'}
      accessibilityHint="Press once to talk to METEVO; press again to stop."
    >
      {listening ? (
        <ListeningVoice
          width={layout.voiceViewport}
          height={layout.voiceViewport}
        />
      ) : (
        <IdleVoice width={layout.voiceViewport} height={layout.voiceViewport} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  anchor: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
