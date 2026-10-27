import React, { useCallback, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import AttentionDark from '../assets/voice_attention_dark.svg';
import AttentionLight from '../assets/voice_attention_light.svg';
import IdleDark from '../assets/voice_idle_dark.svg';
import IdleLight from '../assets/voice_idle_light.svg';
import ListeningDark from '../assets/voice_listening_dark.svg';
import ListeningLight from '../assets/voice_listening_light.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { chooseArchiveDirectory } from '../utils/recordingArchive';
import { layout } from './styles';

export type VoiceControlState = 'idle' | 'listening' | 'attention';

interface RecordingControlsProps {
  /** True while the mic is live (the hold button is held down). */
  recording: boolean;
  /** Draws the attention cue when the wallet is unavailable. */
  state?: VoiceControlState;
  /** Hold started: begins capture (barge-in when a turn is running). */
  onPressIn: () => void;
  /** Hold released: the captured clip enters the voice turn. */
  onPressOut: () => void;
  /** The most recent finished clip uri, for the debug replay button. */
  lastClipUri: string | null;
}

/**
 * Bottom shell region: the hold-to-talk microphone centered, with the
 * voice state cue of the design (idle, listening, attention). The audio
 * on/off toggle lives in the StatusHeader.
 *
 * Separation rule: this component knows nothing about intents, the
 * recording state machine or the DynamicFrame - it only renders the hold
 * state and reports press and release. The voice orchestrator owns the
 * turn.
 */
export function RecordingControls({
  recording,
  state = 'idle',
  onPressIn,
  onPressOut,
  lastClipUri,
}: RecordingControlsProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const playerRef = useRef<AudioPlayer | null>(null);

  const replayLast = useCallback(() => {
    if (!lastClipUri) {
      return;
    }
    playerRef.current?.remove();
    playerRef.current = createAudioPlayer(lastClipUri);
    playerRef.current.play();
  }, [lastClipUri]);

  const pickArchiveFolder = useCallback(async () => {
    const directoryUri = await chooseArchiveDirectory();
    console.log('[metevo] archive folder:', directoryUri ?? 'not chosen');
  }, []);

  const dark = theme.mode === 'dark';
  const effective = recording ? 'listening' : state;
  const VoiceCue =
    effective === 'listening'
      ? dark
        ? ListeningDark
        : ListeningLight
      : effective === 'attention'
        ? dark
          ? AttentionDark
          : AttentionLight
        : dark
          ? IdleDark
          : IdleLight;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.debugButton}
        onPress={replayLast}
        onLongPress={() => {
          void pickArchiveFolder();
        }}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel="Replay last recording; long-press to choose the archive folder"
      >
        <Text style={styles.debugLabel}>▶</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.voiceButton}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        delayPressIn={80}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Release to send' : 'Hold to talk'}
        accessibilityHint="Hold the button and speak; release when done."
      >
        <VoiceCue width={layout.voiceViewport} height={layout.voiceViewport} />
      </TouchableOpacity>

      <View style={styles.sideSpacer} />
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    width: '100%' as const,
  },
  voiceButton: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  debugButton: {
    width: layout.secondaryButton,
    height: layout.secondaryButton,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  debugLabel: {
    ...theme.typography.caption,
    opacity: 0.35,
  },
  sideSpacer: { width: layout.secondaryButton },
});
