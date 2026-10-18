import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../../design/ThemeContext';
import { useWalletSession } from '../../hooks/useWalletSession';
import { layout } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { OnboardingFrame } from './OnboardingFrame';

type AccountStage = 'welcome' | 'create' | 'signIn';

interface AccountAccessProps {
  /** True while the wallet secret is being created and stored. */
  creating: boolean;
  errorMessage: string | null;
  onCreateAccount: (walletName: string) => void;
  onSignIn: () => void;
  onBack: () => void;
}

/**
 * Design section 28: account welcome, create and sign-in states. The
 * account contract is team-owned (no working authentication exists yet),
 * so the fields validate locally and Sign in continues without a backend.
 * Create account continues into the wallet setup: seed generation behind
 * device biometrics, stored in the device secure store only.
 */
export function AccountAccess({
  creating,
  errorMessage,
  onCreateAccount,
  onSignIn,
  onBack,
}: AccountAccessProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { hasStoredWallet } = useWalletSession();
  const [stage, setStage] = useState<AccountStage>('welcome');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [walletName, setWalletName] = useState('Everyday wallet');
  const [walletCount, setWalletCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void hasStoredWallet().then((exists) => {
      if (!cancelled) {
        setWalletCount(exists ? 1 : 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasStoredWallet]);

  if (stage === 'welcome') {
    return (
      <OnboardingFrame
        title="Welcome to METEVO"
        subtitle="Your money. Your voice."
        hearOptionCount={2}
        onBack={onBack}
      >
        <Text style={theme.typography.body}>One account. Multiple wallets.</Text>
        {walletCount !== null && walletCount > 0 && (
          <Text style={styles.existingNote}>
            {walletCount} wallet{walletCount > 1 ? 's' : ''} on this device -
            open one or create another.
          </Text>
        )}
        <ActionButton
          label="Create account"
          variant="primary"
          onPress={() => setStage('create')}
          grow
        />
        <ActionButton
          label="Sign in"
          variant="outlined"
          onPress={() => setStage('signIn')}
          grow
        />
      </OnboardingFrame>
    );
  }

  if (stage === 'create') {
    return (
      <OnboardingFrame
        title="Create account"
        subtitle="For a new METEVO account."
        hearOptionCount={3}
        onBack={() => setStage('welcome')}
        onConfirm={() => onCreateAccount(walletName)}
        confirmDisabled={creating || fullName.trim().length === 0}
      >
        <LabeledField
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
        />
        <LabeledField
          label="Email or phone"
          value={contact}
          onChangeText={setContact}
        />
        <LabeledField
          label="Wallet name"
          value={walletName}
          onChangeText={setWalletName}
        />
        {creating && (
          <Text style={theme.typography.caption}>Creating your wallet…</Text>
        )}
        {errorMessage !== null && (
          <Text style={styles.error}>{errorMessage}</Text>
        )}
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      title="Sign in"
      subtitle="Welcome back."
      hearOptionCount={2}
      onBack={() => setStage('welcome')}
      onConfirm={onSignIn}
    >
      <LabeledField
        label="Email or phone"
        value={contact}
        onChangeText={setContact}
      />
      <ActionButton
        label="Use passkey"
        variant="outlined"
        // TODO(account): passkey availability is a team-owned contract.
        onPress={() => undefined}
        grow
      />
    </OnboardingFrame>
  );
}

interface LabeledFieldProps {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
}

function LabeledField({ label, value, onChangeText }: LabeledFieldProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.field}>
      <Text style={theme.typography.caption}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        autoCapitalize="none"
      />
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  existingNote: {
    ...theme.typography.caption,
    color: theme.voiceStates.attention.fill,
  },
  field: {
    ...theme.cardBase,
    gap: layout.rowGap / 4,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    padding: 0,
  },
  error: {
    ...theme.typography.caption,
    color: theme.voiceStates.attention.fill,
  },
});
