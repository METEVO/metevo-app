import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BalancesCard } from '../components/BalancesCard';
import { DynamicFrame } from '../components/DynamicFrame';
import { HistorySpendingLinks } from '../components/HistorySpendingLinks';
import { RecordingControls } from '../components/RecordingControls';
import { StatusHeader } from '../components/StatusHeader';
import { TransactionList } from '../components/TransactionList';
import { MOCK_TRANSACTIONS } from '../components/mocks';
import { layout } from '../components/styles';
import { useIntents } from '../hooks/useIntents';
import { archiveRecording } from '../utils/recordingArchive';

/**
 * Main (only) screen: the design's fixed shell.
 *
 * Header and balance stay anchored at the top, the task canvas scrolls in
 * the middle, and the voice control plus History/Spending actions stay
 * anchored at the bottom, so the voice anchor never moves (see the design
 * handoff's fixed-shell rule). Component boundaries follow the design's
 * shell regions so later phases can swap mock data behind each component
 * without touching the others. No router exists by design.
 *
 * Test seam: to preview a specific intent card, pass its id instead of null
 * below, e.g. useIntents('send-usdm'). See changes_overview_metevo_mockup.md.
 */
export function HomeScreen() {
  const { intent } = useIntents(null);

  return (
    <View style={styles.shell}>
      <StatusHeader />
      <BalancesCard
        balances={[
          { label: 'USDm BAL', value: '$100.00' },
          { label: 'SATS BAL', value: '50,000 sats' },
        ]}
      />

      <ScrollView
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
      >
        <TransactionList transactions={MOCK_TRANSACTIONS} />

        <DynamicFrame intent={intent} />
      </ScrollView>

      <View style={styles.bottomRegion}>
        <RecordingControls onRecordingComplete={handleRecordingComplete} />

        <HistorySpendingLinks />
      </View>
    </View>
  );
}

/**
 * Foundation seam: the recorder hands its output over here.
 * TODO(phase 2): forward to the on-device QVAC voice-to-intent pipeline.
 *
 * Debug support: copy the finished recording into the user-chosen archive
 * folder (SAF) so it is retrievable outside the app sandbox. No-op until a
 * folder is chosen via long-press on the replay button.
 */
function handleRecordingComplete(recordingUri: string | null): void {
  console.log('[metevo] recording finished (non-functional):', recordingUri);
  if (recordingUri === null) {
    return;
  }
  void archiveRecording(recordingUri).then((archivedUri) => {
    if (archivedUri) {
      console.log('[metevo] recording archived to:', archivedUri);
    }
  });
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    gap: layout.sectionGap,
  },
  canvas: {
    flex: 1,
  },
  canvasContent: {
    gap: layout.sectionGap,
    paddingBottom: layout.sectionGap,
  },
  bottomRegion: {
    gap: layout.rowGap,
    paddingBottom: layout.rowGap,
  },
});
