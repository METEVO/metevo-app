import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { layout, scale } from '../components/styles';
import {
  useTheme,
  useThemedStyles,
  type MetevoTheme,
} from '../design/ThemeContext';
import { useIntents } from '../hooks/useIntents';
import { useVoicePipeline } from '../hooks/useVoicePipeline';
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
  const styles = useThemedStyles(makeStyles);

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
 * The connected home shell. The recording hand-off below is live: a finished
 * recording goes through the on-device QVAC voice pipeline (transcribe ->
 * WalletIntent agent -> deterministic validation) and lands as a card in the
 * DynamicFrame plus a spoken announcement in the session language.
 */
function HomeShell({ session }: { session: WalletSession }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { intent, simulateIntent } = useIntents(null);
  const voice = useVoicePipeline(session.language);
  const channelProvisioning =
    session.wallet !== null && !session.wallet.channelReady;

  // The pipeline's outcome drives the frame: the validated card id opens
  // the matching card; null keeps the idle hint.
  useEffect(() => {
    if (voice.outcome === null) {
      return;
    }
    simulateIntent(voice.outcome.cardId);
  }, [voice.outcome, simulateIntent]);

  const handleRecordingComplete = useCallback((recordingUri: string | null) => {
    if (recordingUri === null) {
      return;
    }
    voice.run(recordingUri);

    // Debug support: copy the finished recording into the user-chosen
    // archive folder (SAF) so it is retrievable outside the app sandbox.
    void archiveRecording(recordingUri).then((archivedUri) => {
      if (archivedUri) {
        console.log('[metevo] recording archived to:', archivedUri);
      }
    });
  }, [voice]);

  // While the LSP has not provisioned the USDm channel yet, keep polling:
  // readiness lands asynchronously after "Wallet connected".
  useEffect(() => {
    if (!channelProvisioning) {
      return undefined;
    }
    const refreshTimer = setInterval(() => void session.refreshWallet(), CHANNEL_REFRESH_INTERVAL_MS);
    return () => clearInterval(refreshTimer);
  }, [channelProvisioning, session]);

  return (
    <View style={styles.shell}>
      <StatusHeader walletConnected={session.wallet !== null} />
      <BalancesCard balances={sessionBalances(session)} />

      <ScrollView
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
      >
        {channelProvisioning && (
          <View style={styles.provisioningNote}>
            <Text style={styles.provisioningTitle}>Opening your USDm channel…</Text>
            <Text style={styles.provisioningBody}>
              Sending and receiving unlock when it is ready.
            </Text>
          </View>
        )}

        <View style={styles.quickActions}>
          <ActionButton
            label="Receive money"
            variant="primary"
            onPress={() => simulateIntent('create-usdm-invoice')}
            disabled={channelProvisioning}
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

/** Background poll cadence while the LSP provisions the USDm channel. */
const CHANNEL_REFRESH_INTERVAL_MS = 5_000;

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

const makeStyles = (theme: MetevoTheme) => ({
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
  provisioningNote: {
    ...theme.cardBase,
    borderColor: theme.voiceStates.attention.fill,
    gap: layout.rowGap / 4,
  },
  provisioningTitle: {
    ...theme.typography.body,
    fontWeight: '700' as const,
  },
  provisioningBody: theme.typography.caption,
  quickActions: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
  bottomRegion: {
    gap: layout.rowGap,
    paddingBottom: layout.rowGap,
  },
});
