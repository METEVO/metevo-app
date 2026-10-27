import React, { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';

import { BalancesCard } from '../components/BalancesCard';
import { AttentionSignalProvider, useAttentionActive } from '../components/AttentionSignal';
import { DynamicFrame } from '../components/DynamicFrame';
import { HistorySpendingLinks } from '../components/HistorySpendingLinks';
import { RecordingControls } from '../components/RecordingControls';
import { StatusHeader } from '../components/StatusHeader';
import { TaskPanel } from '../components/TaskPanel';
import { ActionButton } from '../components/ui/ActionButton';
import { layout, scale } from '../components/styles';
import { ENV } from '../config/env';
import {
  useTheme,
  useThemedStyles,
  type MetevoTheme,
} from '../design/ThemeContext';
import { useIntents } from '../hooks/useIntents';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { WalletSession, useWalletSession } from '../hooks/useWalletSession';
import { archiveRecording } from '../utils/recordingArchive';

/**
 * Main (only) screen. The app opens straight into the connected home shell:
 * the wallet (the Docker regtest node in remote mode) connects by itself on
 * mount and the hold-to-talk voice agent is ready from the first frame.
 * There is no sign-in and no wallet creation.
 */
export function HomeScreen() {
  const session = useWalletSession();
  return (
    <AttentionSignalProvider>
      <HomeShell session={session} />
    </AttentionSignalProvider>
  );
}

/**
 * The connected home shell of the design (HOME-01): profile and audio
 * chips, the wallet state row, the balance box, the fixed task card and
 * the microphone anchored below it. The card holds the idle menu or the
 * active intent panel; the offline and connection states replace it with
 * the design's attention card.
 *
 * A finished recording goes through the on-device QVAC voice agent
 * (Whisper -> Qwen instruction -> intent mapping) and lands as a card with
 * a spoken reply.
 */
function HomeShell({ session }: { session: WalletSession }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { intent, payload, simulateIntent } = useIntents(null);

  // Debug support: copy each finished recording into the user-chosen
  // archive folder (SAF) so it is retrievable outside the app sandbox.
  const handleRecordingFinished = useCallback((recordingUri: string | null) => {
    if (recordingUri === null) {
      return;
    }
    void archiveRecording(recordingUri).then((archivedUri) => {
      if (archivedUri) {
        console.log('[metevo] recording archived to:', archivedUri);
      }
    });
  }, []);

  const voice = useVoiceAssistant(
    ({ cardId, payload: voicePayload }) => simulateIntent(cardId, voicePayload),
    handleRecordingFinished,
    {
      // The balance answer speaks the live values, not just the template.
      getBalances: () => {
        if (session.wallet === null) {
          return null;
        }
        return {
          usdm:
            session.wallet.balanceUsdmBaseUnits === null
              ? null
              : session.wallet.balanceUsdmBaseUnits / 10 ** USDM_PRECISION_DIGITS,
          sats: session.wallet.btcSpendableSat,
        };
      },
    },
  );
  const walletOpen = session.wallet !== null;
  const nodeOffline = session.connection === 'offline';
  const cardAttention = useAttentionActive();
  /** ERR-03: the voice button mirrors every unavailable or failed state. */
  const attention = nodeOffline || session.errorMessage !== null || cardAttention;
  // While attention is shown, the shell's own label wins over a stale
  // spoken answer; a running turn still reports its own progress.
  const statusMessage =
    attention && !voice.recording ? 'Needs attention' : voice.message;
  const statusIsError = !attention && voice.messageIsError;
  const channelProvisioning =
    session.wallet !== null && !nodeOffline && !session.wallet.channelReady;
  const connecting = session.connecting || (walletOpen ? false : !nodeOffline && session.errorMessage === null);
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

  const connection = !walletOpen
    ? 'closed'
    : nodeOffline
      ? 'offline'
      : 'connected';

  return (
    <View style={styles.shell}>
      <StatusHeader connection={connection} />
      <BalancesCard
        label={attention ? 'Last known balance' : 'Available balance'}
        usdm={formatUsdmBalance(session.wallet?.balanceUsdmBaseUnits ?? null)}
        sats={formatSats(session.wallet?.btcSpendableSat ?? null)}
      />

      {nodeOffline ? (
        <TaskPanel variant="attention">
          <View style={styles.statusPanel}>
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>{'Wallet unavailable'}</Text>
              <Text style={styles.statusBody}>No payment was submitted.</Text>
              <Text style={styles.statusBody}>Reconnect to continue.</Text>
            </View>
            <ActionButton
              label="Reconnect"
              variant="outlined"
              attention
              onPress={() => void session.openWallet()}
            />
          </View>
        </TaskPanel>
      ) : session.errorMessage !== null ? (
        <TaskPanel variant="attention">
          <View style={styles.statusPanel}>
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>{'The wallet did not connect'}</Text>
              <Text style={styles.statusBody}>{session.errorMessage}</Text>
            </View>
            <ActionButton
              label="Try again"
              variant="primary"
              onPress={() => void session.openWallet()}
            />
          </View>
        </TaskPanel>
      ) : connecting ? (
        <TaskPanel>
          <View style={styles.statusCopy}>
            <Text style={styles.panelTitle}>{'Connecting to your wallet node…'}</Text>
            <Text style={styles.statusBody}>
              Balances and payments appear as soon as it is ready.
            </Text>
          </View>
        </TaskPanel>
      ) : channelProvisioning ? (
        <TaskPanel>
          <View style={styles.statusCopy}>
            <Text style={styles.panelTitle}>{'Opening your USDm channel…'}</Text>
            <Text style={styles.statusBody}>
              Sending and receiving unlock when it is ready.
            </Text>
          </View>
        </TaskPanel>
      ) : (
        <DynamicFrame
          intent={intent}
          onClearIntent={() => simulateIntent(null)}
          onSelectIntent={(next) => simulateIntent(next)}
          payload={payload}
        />
      )}

      <View style={styles.spacer} />

      <View style={styles.voiceRegion}>
        <RecordingControls
          recording={voice.recording}
          state={attention ? 'attention' : 'idle'}
          onPressIn={voice.onPressIn}
          onPressOut={voice.onPressOut}
          lastClipUri={voice.lastClipUri}
        />
        {statusMessage !== null && (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.voiceMessage, statusIsError && styles.voiceError]}
          >
            {statusMessage}
          </Text>
        )}
      </View>

      <HistorySpendingLinks />
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

function formatSats(sats: number | null): string {
  if (sats === null) {
    return '— sats';
  }
  // Fixed grouping: the reference design shows 99,678,917 regardless of locale.
  return `${sats.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} sats`;
}

const makeStyles = (theme: MetevoTheme) => ({
  shell: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: scale(10),
    // Reference inset under the bottom controls (512 - 450.2 - 28.32).
    paddingBottom: scale(33.5),
    gap: layout.sectionGap,
  },
  spacer: {
    flex: 1,
    minHeight: scale(8),
  },
  statusPanel: {
    flex: 1,
    justifyContent: 'space-between' as const,
    gap: layout.rowGap,
  },
  statusCopy: {
    gap: layout.rowGap / 2,
  },
  panelTitle: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  statusTitle: {
    ...theme.typography.title,
    color: theme.voiceStates.attention.ink,
  },
  statusBody: theme.typography.body,
  voiceRegion: {
    gap: layout.rowGap,
    alignItems: 'center' as const,
  },
  voiceMessage: {
    ...theme.typography.body,
    textAlign: 'center' as const,
  },
  voiceError: {
    color: theme.voiceStates.attention.ink,
  },
});
