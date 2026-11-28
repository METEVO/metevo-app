import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import {
  ThemePreferenceProvider,
  useThemePreference,
  useThemedStyles,
  type MetevoTheme,
} from './src/design/ThemeContext';
import { WalletSessionProvider, useWalletSession } from './src/hooks/useWalletSession';
import { layout } from './src/components/styles';
import { TaskPanel } from './src/components/TaskPanel';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { WasmHarnessScreen } from './src/screens/WasmHarnessScreen';
import { WasmWebViewHost } from './src/components/WasmWebViewHost';

/**
 * App root.
 *
 * METEVO is one flow, not an app with sections: a single screen, no router.
 * All structure lives in `HomeScreen` and its child components.
 *
 * Safe areas come from react-native-safe-area-context: React Native's
 * built-in SafeAreaView is deprecated and is a no-op on Android (content
 * would render under the status bar).
 */
export default function App() {
  const harnessUrl = process.env.EXPO_PUBLIC_WASM_HARNESS_URL;
  if (harnessUrl) {
    return <WasmHarnessScreen url={harnessUrl} />;
  }

  if (process.env.EXPO_PUBLIC_WALLET_MODE === 'wasm') {
    return (
      <ThemePreferenceProvider>
        <SafeAreaProvider>
          <WasmRoot />
        </SafeAreaProvider>
      </ThemePreferenceProvider>
    );
  }

  return (
    <ThemePreferenceProvider>
      <WalletSessionProvider>
        <AppRoot />
      </WalletSessionProvider>
    </ThemePreferenceProvider>
  );
}

function AppRoot() {
  const { theme } = useThemePreference();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <HomeScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/**
 * The wasm-mode root: AuthScreen gates the session, then the hidden harness
 * hosts the wallet with the seed's stable runtime identity.
 */
function WasmRoot() {
  const [session, setSession] = useState<{ seed: string; runtimeId: string } | null>(null);

  if (session === null) {
    return <AuthScreen onAuthenticated={(seed, runtimeId) => setSession({ seed, runtimeId })} />;
  }

  return (
    <>
      <WasmWebViewHost mnemonic={session.seed} runtimeId={session.runtimeId} />
      <WalletSessionProvider>
        <AppRoot />
        <WalletPreparingOverlay />
      </WalletSessionProvider>
    </>
  );
}

/** Covers the shell until the wasm wallet reports its first snapshot. */
function WalletPreparingOverlay() {
  const session = useWalletSession();
  const { theme } = useThemePreference();
  const styles = useThemedStyles(makeOverlayStyles);

  // Hidden once the wallet opens; on failure the shell's own attention
  // panel (with Try again) must be reachable, so the overlay steps aside.
  if (session.wallet !== null || session.errorMessage !== null) {
    return null;
  }

  return (
    <View style={[styles.overlay, { backgroundColor: theme.colors.background }]}>
      <TaskPanel>
        <Text style={styles.title}>Please wait</Text>
        <Text style={styles.body}>Preparing your wallet</Text>
      </TaskPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const makeOverlayStyles = (theme: MetevoTheme) => ({
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: layout.screenPadding,
  },
  title: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  body: theme.typography.body,
});
