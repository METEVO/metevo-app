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
 * Main (only) screen: the wireframe sketch, top to bottom.
 *
 * Component boundaries follow the sketch sections so later phases can swap
 * mock data behind each component without touching the others. No router
 * exists by design (see SPEC.md).
 *
 * Test seam: to preview a specific intent card, pass its id instead of null
 * below, e.g. useIntents('send-usdm'). See changes_overview_metevo_mockup.md.
 */
export function HomeScreen() {
  const { intent } = useIntents(null);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <StatusHeader />
      <BalancesCard
        balances={[
          { label: 'USDm BAL', value: '$100.00' },
          { label: 'SATS BAL', value: '50,000 sats' },
        ]}
      />

      <TransactionList transactions={MOCK_TRANSACTIONS} />

      <DynamicFrame intent={intent} />

      <RecordingControls onRecordingComplete={handleRecordingComplete} />

      <HistorySpendingLinks />
    </ScrollView>
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
  content: {
    padding: layout.screenPadding,
    gap: layout.sectionGap,
  },
});
