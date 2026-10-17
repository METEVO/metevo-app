import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AttentionVoice from '../../assets/voice_attention_dark.svg';
import IdleVoice from '../../assets/voice_idle_dark.svg';
import ProcessingVoice from '../../assets/voice_processing_dark.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import {
  startSpokenOptionHighlight,
  stopSpokenOptionHighlight,
} from '../../services/spokenInteraction';
import { WalletSetupStep } from '../../services/metevo/wallet-gateway';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { OnboardingFrame } from './OnboardingFrame';

const WALLETS = ['Everyday wallet', 'Savings wallet'] as const;

export type WalletChoice = (typeof WALLETS)[number];

const OPENING_TITLE = 'Opening…';
const PLEASE_WAIT = 'Please wait';
const ATTENTION_TITLE = 'Needs attention';

interface WalletSelectorProps {
  setupStep: WalletSetupStep;
  progressMessage: string | null;
  errorMessage: string | null;
  onOpen: () => void;
  onBack: () => void;
}

/**
 * Design sections 29 and 35: select a wallet, then an explicit Open wallet
 * action runs the connection state machine - node opening, LSP connection
 * and USDm channel provisioning - with the processing voice state while it
 * works and the attention state with a recovery action on failure.
 */
export function WalletSelector({
  setupStep,
  progressMessage,
  errorMessage,
  onOpen,
  onBack,
}: WalletSelectorProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [selected, setSelected] = useState<WalletChoice | null>(null);
  const [hearing, setHearing] = useState(false);

  const toggleHearing = useCallback(() => {
    if (hearing) {
      stopSpokenOptionHighlight();
      setHearing(false);
      return;
    }
    startSpokenOptionHighlight(WALLETS.length, () => undefined);
    setHearing(true);
  }, [hearing]);

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
          <ActionButton label="Try again" variant="primary" onPress={onOpen} grow />
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
        <Text style={theme.typography.title}>{progressMessage ?? OPENING_TITLE}</Text>
        <Text style={theme.typography.caption}>{PLEASE_WAIT}</Text>
      </View>
    );
  }

  return (
    <OnboardingFrame
      title="Choose a wallet"
      subtitle="Select a wallet or say its name."
      hearOptionCount={WALLETS.length}
      confirmLabel="Open wallet"
      confirmDisabled={selected === null}
      onConfirm={onOpen}
      onBack={onBack}
    >
      <Text style={theme.typography.caption}>No wallet open</Text>
      <Text style={theme.typography.body}>Your wallets</Text>

      {WALLETS.map((wallet) => (
        <TouchableOpacity
          key={wallet}
          style={[styles.option, selected === wallet && styles.optionSelected]}
          onPress={() => setSelected(wallet)}
          accessibilityRole="button"
          accessibilityLabel={wallet}
          accessibilityState={{ selected: selected === wallet }}
        >
          <Text style={styles.optionLabel}>{wallet}</Text>
        </TouchableOpacity>
      ))}

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
  actions: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
});
