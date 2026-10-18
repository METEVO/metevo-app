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
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { chooseArchiveDirectory } from '../utils/recordingArchive';
import { layout } from './styles';

interface RecordingControlsProps {
  /** Called once per finished recording with its file uri (or null on
   * failure). The home shell hands it to the QVAC voice pipeline. */
  onRecordingComplete: (recordingUri: string | null) => void;
}

/**
 * Bottom shell region: the stateful voice control centered with a small
 * debug replay button on the left. The audio on/off toggle lives in the
 * StatusHeader.
 *
 * Voice states follow the design handoff: idle shows the microphone
 * silhouette and starts recording; listening shows the stop square with a
 * solid outer ring and stops recording. Stopping never implies acceptance,
 * and the processing, success and attention states arrive with the
 * functional phases.
 *
 * TODO(debug): the left button exists only for on-device verification -
 * short-press replays the last recording, long-press opens the folder
 * picker that chooses where recordings are archived. Replace it with the
 * language picker in phase 2.
 *
 * Separation rule: this component knows nothing about intents or the
 * DynamicFrame - it only runs the recording state machine and reports the
 * result through `onRecordingComplete`.
 */
export function RecordingControls({ onRecordingComplete }: RecordingControlsProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const lastUriRef = useRef<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const handleCompleted = useCallback(
    (uri: string | null) => {
      lastUriRef.current = uri;
      onRecordingComplete(uri);
    },
    [onRecordingComplete],
  );

  const replayLast = useCallback(() => {
    const uri = lastUriRef.current;
    if (!uri) {
      return;
    }
    playerRef.current?.remove();
    playerRef.current = createAudioPlayer(uri);
    playerRef.current.play();
  }, []);

  const pickArchiveFolder = useCallback(async () => {
    const directoryUri = await chooseArchiveDirectory();
    console.log('[metevo] archive folder:', directoryUri ?? 'not chosen');
  }, []);

  const { phase, start, stop } = useAudioRecorder(handleCompleted);

  const recording = phase === 'recording';

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
        onPress={recording ? stop : start}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Stop talking' : 'Talk'}
        accessibilityHint="Press once to talk to METEVO; press again or stay silent to stop."
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
