import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import IdleVoice from '../assets/voice_idle_dark.svg';
import ListeningVoice from '../assets/voice_listening_dark.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { chooseArchiveDirectory } from '../utils/recordingArchive';
import { layout } from './styles';

interface RecordingControlsProps {
  /** True while the mic is live (the hold button is held down). */
  recording: boolean;
  /** Hold started: begins capture (barge-in when a turn is running). */
  onPressIn: () => void;
  /** Hold released: the captured clip enters the voice turn. */
  onPressOut: () => void;
  /** The most recent finished clip uri, for the debug replay button. */
  lastClipUri: string | null;
}

/**
 * Bottom shell region: the hold-to-talk button centered with a small
 * debug replay button on the left. The audio on/off toggle lives in the
 * StatusHeader.
 *
 * Separation rule: this component knows nothing about intents, the
 * recording state machine or the DynamicFrame - it only renders the hold
 * state and reports press and release. The voice orchestrator owns the
 * turn.
 */
export function RecordingControls({
  recording,
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

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.sideButton}
        onPress={replayLast}
        onLongPress={() => {
          void pickArchiveFolder();
        }}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel="Replay last recording; long-press to choose the archive folder"
      >
        <Text style={styles.sideLabel}>▶</Text>
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
        {recording ? (
          <ListeningVoice
            width={layout.voiceViewport}
            height={layout.voiceViewport}
          />
        ) : (
          <IdleVoice
            width={layout.voiceViewport}
            height={layout.voiceViewport}
          />
        )}
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
  sideButton: {
    width: layout.secondaryButton,
    height: layout.secondaryButton,
    borderRadius: layout.secondaryButton / 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  sideLabel: { ...theme.typography.caption, textAlign: 'center' as const },
  sideSpacer: { width: layout.secondaryButton },
});
