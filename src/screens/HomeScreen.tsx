import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BalancesCard } from '../components/BalancesCard';
import { DynamicFrame } from '../components/DynamicFrame';
import { HistorySpendingLinks } from '../components/HistorySpendingLinks';
import { RecordingControls } from '../components/RecordingControls';
import { StatusHeader } from '../components/StatusHeader';
import { TransactionList } from '../components/TransactionList';
import { AccountAccess } from '../components/onboarding/AccountAccess';
import { LanguageOptions } from '../components/onboarding/LanguageOptions';
import { OpeningSplash } from '../components/onboarding/OpeningSplash';
import { ThemeOptions } from '../components/onboarding/ThemeOptions';
import { WalletSelector } from '../components/onboarding/WalletSelector';
import { ActionButton } from '../components/ui/ActionButton';
import { MOCK_TRANSACTIONS } from '../components/mocks';
import { layout } from '../components/styles';
import { useIntents } from '../hooks/useIntents';
import { WalletSession, useWalletSession } from '../hooks/useWalletSession';
import { archiveRecording } from '../utils/recordingArchive';

/**
 * Main (only) screen: the design's flow, phase-driven (no router).
 *
 * Opening, language, theme, account and wallet-selection phases render the
 * onboarding components; the connected phase renders the fixed home shell
 * (anchored header and balance, scrollable task canvas, anchored voice
 * control and bottom actions).
 *
 * Test seam: to preview a specific intent card, pass its id instead of null
 * below, e.g. useIntents('send-usdm'). See changes_overview_metevo_mockup.md.
 */
export function HomeScreen() {
  const session = useWalletSession();

  switch (session.phase) {
    case 'opening':
      return (
        <View style={styles.fill}>
          <OpeningSplash onContinue={session.continueOpening} />
        </View>
      );
    case 'language':
      return (
        <View style={styles.fill}>
          <LanguageOptions
            selected={session.language}
            onSelect={session.chooseLanguage}
            onContinue={session.continueLanguage}
          />
        </View>
      );
    case 'theme':
      return (
        <View style={styles.fill}>
          <ThemeOptions
            selected={session.theme}
            onSelect={session.chooseTheme}
            onContinue={session.continueTheme}
          />
        </View>
      );
    case 'account':
      return (
        <View style={styles.fill}>
          <AccountAccess
            creating={session.setupStep === 'creating-secret'}
            errorMessage={session.errorMessage}
            onCreateAccount={session.createWallet}
            onSignIn={session.requestSignIn}
            onBack={() => session.reopenPhase('theme')}
          />
        </View>
      );
    case 'wallet':
      return (
        <View style={styles.fill}>
          <WalletSelector
            setupStep={session.setupStep}
            progressMessage={session.progressMessage}
            errorMessage={session.errorMessage}
            onOpen={session.openWallet}
            onBack={() => session.reopenPhase('account')}
          />
        </View>
      );
    case 'home':
      return <HomeShell session={session} />;
  }
}

/**
 * The connected home shell. The voice recording hand-off below is the
 * QVAC voice-to-intent insertion point: phase 2 pipes the finished
 * recording into the recognition process and calls `simulateIntent` with
 * the resulting intent id.
 */
function HomeShell({ session }: { session: WalletSession }) {
  const { intent, simulateIntent } = useIntents(null);

  return (
    <View style={styles.shell}>
      <StatusHeader walletConnected={session.wallet !== null} />
      <BalancesCard balances={sessionBalances(session)} />

      <ScrollView
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
      >
        <View style={styles.quickActions}>
          <ActionButton
            label="Receive money"
            variant="primary"
            onPress={() => simulateIntent('create-usdm-invoice')}
            grow
          />
          <ActionButton
            label="Contacts"
            variant="outlined"
            onPress={() => simulateIntent('contacts')}
            grow
          />
        </View>

        <TransactionList transactions={MOCK_TRANSACTIONS} />

        <DynamicFrame
          intent={intent}
          onClearIntent={() => simulateIntent(null)}
        />
      </ScrollView>

      <View style={styles.bottomRegion}>
        <RecordingControls onRecordingComplete={handleRecordingComplete} />

        <HistorySpendingLinks />
      </View>
    </View>
  );
}

const USDM_PRECISION_DIGITS = 8;

/** Formats the wallet's USDm base units as the design's "20.00 USDm". */
function formatUsdmBalance(baseUnits: number | null): string {
  if (baseUnits === null) {
    return '— USDm';
  }
  return `${(baseUnits / 10 ** USDM_PRECISION_DIGITS).toFixed(2)} USDm`;
}

function sessionBalances(session: WalletSession) {
  if (session.wallet === null) {
    return [];
  }
  return [
    { label: 'USDm BAL', value: formatUsdmBalance(session.wallet.balanceUsdmBaseUnits) },
    { label: 'SATS BAL', value: `${session.wallet.btcSpendableSat} sats` },
  ];
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
  fill: {
    flex: 1,
  },
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
  quickActions: {
    flexDirection: 'row',
    gap: layout.rowGap,
  },
  bottomRegion: {
    gap: layout.rowGap,
    paddingBottom: layout.rowGap,
  },
});
