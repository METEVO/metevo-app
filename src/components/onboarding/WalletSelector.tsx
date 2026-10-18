import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AttentionVoice from '../../assets/voice_attention_dark.svg';
import IdleVoice from '../../assets/voice_idle_dark.svg';
import ProcessingVoice from '../../assets/voice_processing_dark.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { useWalletSession } from '../../hooks/useWalletSession';
import {
  startSpokenOptionHighlight,
  stopSpokenOptionHighlight,
} from '../../services/spokenInteraction';
import { WalletSetupStep } from '../../services/metevo/wallet-gateway';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { OnboardingFrame } from './OnboardingFrame';

type SelectorStage = 'select' | 'naming';

const OPENING_TITLE = 'Opening…';
const PLEASE_WAIT = 'Please wait';
const ATTENTION_TITLE = 'Needs attention';
const EMPTY_WALLETS_NOTE = 'No wallets on this device yet.';

interface WalletSelectorProps {
  setupStep: WalletSetupStep;
  progressMessage: string | null;
  errorMessage: string | null;
  onBack: () => void;
}

/**
 * Design sections 29 and 35, backed by the device's real wallets: select a
 * stored wallet and open it (node + LSP + channel state machine), or create
 * a new named wallet - one account, multiple wallets. Processing and
 * attention states cover the connection; failures keep a recovery action.
 */
export function WalletSelector({
  setupStep,
  progressMessage,
  errorMessage,
  onBack,
}: WalletSelectorProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { wallets, selectedWalletId, chooseWallet, createWallet, openWallet } =
    useWalletSession();
  const [stage, setStage] = useState<SelectorStage>('select');
  const [nameDraft, setNameDraft] = useState('');
  const [hearing, setHearing] = useState(false);

  const toggleHearing = useCallback(() => {
    if (hearing) {
      stopSpokenOptionHighlight();
      setHearing(false);
      return;
    }
    startSpokenOptionHighlight(wallets.length + 1, () => undefined);
    setHearing(true);
  }, [hearing, wallets.length]);

  const startNaming = useCallback(() => {
    setNameDraft('');
    setStage('naming');
  }, []);

  const saveWallet = useCallback(async () => {
    if (nameDraft.trim().length === 0) {
      return;
    }
    await createWallet(nameDraft);
    setStage('select');
  }, [createWallet, nameDraft]);

  if (errorMessage !== null) {
    return (
      <View style={styles.fill}>
        <View style={styles.voiceAnchor}>
          <AttentionVoice
            width={layout.voiceViewport}
            height={layout.voiceViewport}
          />
        </View>
        <Text style={theme.typography.title}>{ATTENTION_TITLE}</Text>
        <Text style={theme.typography.body}>{errorMessage}</Text>
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={onBack} />
          <ActionButton label="Try again" variant="primary" onPress={onBack} grow />
        </View>
      </View>
    );
  }

  if (setupStep !== 'idle' && setupStep !== 'ready') {
    return (
      <View style={styles.fill}>
        <View style={styles.voiceAnchor}>
          <ProcessingVoice
            width={layout.voiceViewport}
            height={layout.voiceViewport}
          />
        </View>
        <Text style={theme.typography.title}>
          {progressMessage ?? OPENING_TITLE}
        </Text>
        <Text style={theme.typography.caption}>{PLEASE_WAIT}</Text>
      </View>
    );
  }

  if (stage === 'naming') {
    return (
      <OnboardingFrame
        title="Name your wallet"
        subtitle="A name helps you pick it by voice later."
        hearOptionCount={1}
        onBack={() => setStage('select')}
        confirmLabel="Create wallet"
        confirmDisabled={nameDraft.trim().length === 0}
        onConfirm={() => void saveWallet()}
      >
        <View style={styles.field}>
          <Text style={theme.typography.caption}>Wallet name</Text>
          <TextInput
            style={styles.input}
            value={nameDraft}
            onChangeText={setNameDraft}
            accessibilityLabel="Wallet name"
            placeholder="Everyday wallet"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      title="Choose a wallet"
      subtitle="Select a wallet or say its name."
      hearOptionCount={wallets.length + 1}
      confirmLabel="Open wallet"
      confirmDisabled={selectedWalletId === null}
      onConfirm={() => void openWallet()}
      onBack={onBack}
    >
      <Text style={theme.typography.caption}>No wallet open</Text>
      <Text style={theme.typography.body}>Your wallets</Text>

      {wallets.length === 0 && (
        <Text style={theme.typography.caption}>{EMPTY_WALLETS_NOTE}</Text>
      )}

      {wallets.map((wallet) => (
        <TouchableOpacity
          key={wallet.id}
          style={[
            styles.option,
            selectedWalletId === wallet.id && styles.optionSelected,
          ]}
          onPress={() => chooseWallet(wallet.id)}
          accessibilityRole="button"
          accessibilityLabel={wallet.name}
          accessibilityState={{ selected: selectedWalletId === wallet.id }}
        >
          <Text style={styles.optionLabel}>{wallet.name}</Text>
        </TouchableOpacity>
      ))}

      <ActionButton label="Create wallet" variant="outlined" onPress={startNaming} grow />

      <View style={styles.voiceAnchor}>
        <IdleVoice width={layout.voiceViewport} height={layout.voiceViewport} />
      </View>
    </OnboardingFrame>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  fill: {
    flex: 1,
    gap: layout.rowGap,
    justifyContent: 'center' as const,
  },
  voiceAnchor: {
    alignItems: 'center' as const,
  },
  option: {
    ...theme.cardBase,
    minHeight: scale(14.16),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  optionLabel: theme.typography.body,
  field: {
    ...theme.cardBase,
    gap: layout.rowGap / 4,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    padding: 0,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
});
