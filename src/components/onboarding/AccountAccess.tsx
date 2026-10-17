import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { cardBase, colors, layout, typography, voiceStates } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { OnboardingFrame } from './OnboardingFrame';

type AccountStage = 'welcome' | 'create' | 'signIn';

interface AccountAccessProps {
  /** True while the wallet secret is being created and stored. */
  creating: boolean;
  errorMessage: string | null;
  onCreateAccount: () => void;
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
  const [stage, setStage] = useState<AccountStage>('welcome');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');

  if (stage === 'welcome') {
    return (
      <OnboardingFrame
        title="Welcome to METEVO"
        subtitle="Your money. Your voice."
        hearOptionCount={2}
        onBack={onBack}
      >
        <Text style={typography.body}>One account. Multiple wallets.</Text>
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
        hearOptionCount={2}
        onBack={() => setStage('welcome')}
        onConfirm={onCreateAccount}
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
        {creating && (
          <Text style={typography.caption}>Creating your wallet…</Text>
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
  return (
    <View style={styles.field}>
      <Text style={typography.caption}>{label}</Text>
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

const styles = StyleSheet.create({
  field: {
    ...cardBase,
    gap: layout.rowGap / 4,
  },
  input: {
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  error: {
    ...typography.caption,
    color: voiceStates.attention.fill,
  },
});
