import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BalancesCard } from '../components/BalancesCard';
import { DynamicFrame } from '../components/DynamicFrame';
import { HistorySpendingLinks } from '../components/HistorySpendingLinks';
import { RecordingControls } from '../components/RecordingControls';
import { StatusHeader } from '../components/StatusHeader';
import { TransactionList } from '../components/TransactionList';
import { ActionButton } from '../components/ui/ActionButton';
import { layout } from '../components/styles';
import { ENV } from '../config/env';
import {
  useTheme,
  useThemedStyles,
  type MetevoTheme,
} from '../design/ThemeContext';
import { useIntents } from '../hooks/useIntents';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { WalletSession, useWalletSession } from '../hooks/useWalletSession';
import { archiveRecording } from '../utils/recordingArchive';

/**
 * Main (only) screen. The app opens straight into the connected home shell:
 * the wallet (the Docker regtest node in remote mode) connects by itself on
 * mount and the English QVAC voice agent loads in the background. There is
 * no sign-in and no wallet creation.
 */
export function HomeScreen() {
  const session = useWalletSession();
  return <HomeShell session={session} />;
}

/**
 * The connected home shell. A finished recording goes through the on-device
 * QVAC voice agent (Whisper -> Qwen instruction -> intent mapping) and lands
 * as a card in the DynamicFrame with a spoken reply. Cards also stay
 * reachable from the quick actions via `simulateIntent` directly.
 */
function HomeShell({ session }: { session: WalletSession }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { intent, payload, simulateIntent } = useIntents(null);
  const voice = useVoiceAgent(({ cardId, payload: voicePayload }) =>
    simulateIntent(cardId, voicePayload),
  );
  const walletOpen = session.wallet !== null;
  const nodeOffline = session.connection === 'offline';
  const channelProvisioning =
    session.wallet !== null && !nodeOffline && !session.wallet.channelReady;
  const { refreshWallet } = session;

  useEffect(() => {
    if (!walletOpen) {
      return undefined;
    }
    const intervalMs = channelProvisioning
      ? CHANNEL_REFRESH_INTERVAL_MS
      : ENV.EXPO_PUBLIC_WALLET_STATUS_POLL_MS;
    const refreshTimer = setInterval(() => void refreshWallet(), intervalMs);
    return () => clearInterval(refreshTimer);
  }, [walletOpen, channelProvisioning, refreshWallet]);

  const handleRecordingComplete = useCallback(
    (recordingUri: string | null) => {
      if (recordingUri === null) {
        return;
      }
      voice.handleRecording(recordingUri);

      // Debug support: copy the finished recording into the user-chosen
      // archive folder (SAF) so it is retrievable outside the app sandbox.
      void archiveRecording(recordingUri).then((archivedUri) => {
        if (archivedUri) {
          console.log('[metevo] recording archived to:', archivedUri);
        }
      });
    },
    [voice],
  );

  return (
    <View style={styles.shell}>
      <StatusHeader connection={!walletOpen ? 'closed' : nodeOffline ? 'offline' : 'connected'} />
      <BalancesCard balances={sessionBalances(session)} />

      <ScrollView
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
      >
        {session.errorMessage !== null && (
          <View style={styles.provisioningNote}>
            <Text style={styles.provisioningTitle}>The wallet did not connect</Text>
            <Text style={styles.provisioningBody}>{session.errorMessage}</Text>
            <ActionButton
              label="Try again"
              variant="primary"
              onPress={() => void session.openWallet()}
            />
          </View>
        )}

        {session.connecting && session.errorMessage === null && (
          <View style={styles.provisioningNote}>
            <Text style={styles.provisioningTitle}>Connecting to your wallet node…</Text>
            <Text style={styles.provisioningBody}>
              Balances and payments appear as soon as it is ready.
            </Text>
          </View>
        )}

        {nodeOffline && !session.connecting && (
          <View style={styles.provisioningNote}>
            <Text style={styles.provisioningTitle}>Can't reach your wallet node</Text>
            <Text style={styles.provisioningBody}>
              Showing your last known balances. Sending and receiving resume when it is back.
            </Text>
          </View>
        )}

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
            disabled={channelProvisioning || nodeOffline}
            grow
          />
          <ActionButton
            label="Contacts"
            variant="outlined"
            onPress={() => simulateIntent('contacts')}
            grow
          />
        </View>

        {/* TODO: wire real transaction history once the gateway exposes
            it; a freshly opened wallet has none, so this starts empty
            rather than showing fixture data. */}
        <TransactionList transactions={[]} />

        <DynamicFrame
          intent={intent}
          onClearIntent={() => simulateIntent(null)}
          payload={payload}
        />
      </ScrollView>

      <View style={styles.bottomRegion}>
        {voice.message !== null && (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.voiceMessage, voice.status === 'failed' && styles.voiceError]}
          >
            {voice.message}
          </Text>
        )}
        <RecordingControls
          onRecordingComplete={handleRecordingComplete}
          disabled={!voice.ready}
        />

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
  voiceMessage: {
    ...theme.typography.body,
    textAlign: 'center' as const,
  },
  voiceError: {
    color: theme.voiceStates.attention.fill,
  },
  bottomRegion: {
    gap: layout.rowGap,
    paddingBottom: layout.rowGap,
  },
});
