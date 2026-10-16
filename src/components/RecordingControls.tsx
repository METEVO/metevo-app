import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { chooseArchiveDirectory } from '../utils/recordingArchive';
import { colors, layout, typography } from './styles';
import { VoiceVisualizer } from './VoiceVisualizer';

interface RecordingControlsProps {
  /**
   * Called once per finished recording with its file uri (or null on
   * failure). TODO(phase 2): hand over to the QVAC voice-to-intent pipeline.
   */
  onRecordingComplete: (recordingUri: string | null) => void;
}

/**
 * Bottom control cluster of the sketch: the big TALK button centered with
 * the AUDIO ON/OFF toggle on the right, and a small debug replay button on
 * the left.
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

  const { phase, currentLevelDb, start, stop } = useAudioRecorder(handleCompleted);

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
        style={[styles.primaryButton, recording && styles.primaryButtonActive]}
        onPress={recording ? stop : start}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Stop talking' : 'Talk'}
        accessibilityHint="Press once to talk to METEVO; press again or stay silent to stop."
      >
        {recording ? (
          <VoiceVisualizer levelDb={currentLevelDb} />
        ) : (
          <Text style={styles.primaryLabel}>TALK</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sideButton}
        onPress={() => undefined}
        accessibilityRole="button"
        accessibilityLabel="Audio on or off"
      >
        <Text style={styles.sideLabel}>AUDIO ON</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  primaryButton: {
    width: layout.primaryButton,
    height: layout.primaryButton,
    borderRadius: layout.primaryButton / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  primaryButtonActive: {
    backgroundColor: colors.danger,
  },
  primaryLabel: typography.primaryLabel,
  sideButton: {
    width: layout.secondaryButton,
    height: layout.secondaryButton,
    borderRadius: layout.secondaryButton / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  sideLabel: { ...typography.caption, textAlign: 'center' },
});
