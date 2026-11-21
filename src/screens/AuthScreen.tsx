import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import IdleDark from '../assets/voice_idle_dark.svg';
import IdleLight from '../assets/voice_idle_light.svg';
import { metevoDesignTokens } from '../design/designTokens';
import { ActionButton } from '../components/ui/ActionButton';
import { layout, scale } from '../components/styles';
import { useTheme, useThemedStyles, type MetevoTheme } from '../design/ThemeContext';
import { designFrameWidth } from '../design/theme';
import {
  generateSeed,
  hasStoredWallet,
  loadSeed,
  saveWallet,
  seedToRuntimeId,
  validateSeed,
} from '../services/auth/authService';

type AuthState = 'welcome' | 'register-seed' | 'connect-seed' | 'unlocking' | 'error';

interface AuthScreenProps {
  /** Called with the unlocked seed and its runtime id; App boots the wallet. */
  onAuthenticated: (seed: string, runtimeId: string) => void;
}

/**
 * The design's auth flow (AUTH-01 / AUTH-02) adapted to seed custody: the
 * welcome screen registers or connects a seed, a stored seed unlocks with
 * the device fingerprint, and every interactive state renders the
 * TaskPanel style (mint-bordered card, title + one-line explanation).
 */
export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [mode, setMode] = useState<AuthState>('welcome');
  // Null while the stored-wallet probe runs; welcome renders after it.
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [pendingSeed, setPendingSeed] = useState<string | null>(null);
  const [seedInput, setSeedInput] = useState('');
  const [copied, setCopied] = useState(false);
  // Guards a stale unlock promise (user pressed Cancel) from clobbering a
  // newer unlock attempt.
  const unlockRunRef = useRef(0);

  useEffect(() => {
    void hasStoredWallet()
      .then(setHasWallet)
      .catch(() => setHasWallet(false));
  }, []);

  const finish = (seed: string) => {
    onAuthenticated(seed, seedToRuntimeId(seed));
  };

  const startRegister = () => {
    setPendingSeed(generateSeed());
    setCopied(false);
    setMode('register-seed');
  };

  const confirmRegister = () => {
    if (pendingSeed === null) {
      return;
    }
    void saveWallet(pendingSeed)
      .then(() => finish(pendingSeed))
      .catch(() => setMode('error'));
  };

  const confirmConnect = () => {
    const seed = validateSeed(seedInput);
    if (seed === null) {
      return;
    }
    const proceed = () => {
      void saveWallet(seed)
        .then(() => finish(seed))
        .catch(() => setMode('error'));
    };
    if (hasWallet) {
      Alert.alert(
        'Replace wallet?',
        'A wallet is already stored on this device. Continuing replaces it with the new seed.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace wallet', style: 'destructive', onPress: proceed },
        ],
        { cancelable: true },
      );
      return;
    }
    proceed();
  };

  const startUnlock = () => {
    const run = ++unlockRunRef.current;
    setMode('unlocking');
    void (async () => {
      try {
        const [hardware, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        // No usable biometrics: auto-login instead of prompting.
        if (hardware && enrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock your METEVO wallet',
          });
          if (run !== unlockRunRef.current) {
            return;
          }
          if (!result.success) {
            // User-side cancels go back to welcome; real failures error.
            const cancelled =
              result.error === 'user_cancel' ||
              result.error === 'app_cancel' ||
              result.error === 'system_cancel';
            setMode(cancelled ? 'welcome' : 'error');
            return;
          }
        }
        const seed = await loadSeed();
        if (run !== unlockRunRef.current) {
          return;
        }
        if (seed === null || validateSeed(seed) === null) {
          setMode('error');
          return;
        }
        finish(seed);
      } catch {
        if (run === unlockRunRef.current) {
          setMode('error');
        }
      }
    })();
  };

  const cancelUnlock = () => {
    unlockRunRef.current += 1;
    void LocalAuthentication.cancelAuthenticate().catch(() => undefined);
    setMode('welcome');
  };

  if (hasWallet === null) {
    return <View style={styles.shell} />;
  }

  if (mode === 'welcome') {
    return (
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome to METEVO</Text>
          <Text style={styles.headerBody}>Your money. Your voice.</Text>
        </View>
        <View style={styles.buttonStack}>
          {hasWallet ? (
            <>
              <ActionButton
                label="Login with fingerprint"
                variant="primary"
                grow
                onPress={startUnlock}
              />
              <ActionButton
                label="Connect another seed"
                variant="outlined"
                grow
                onPress={() => setMode('connect-seed')}
              />
            </>
          ) : (
            <>
              <ActionButton
                label="Register new wallet"
                variant="primary"
                grow
                onPress={startRegister}
              />
              <ActionButton
                label="Connect existing seed"
                variant="outlined"
                grow
                onPress={() => setMode('connect-seed')}
              />
            </>
          )}
        </View>
        <VoiceFooter />
      </View>
    );
  }

  if (mode === 'register-seed' && pendingSeed !== null) {
    return (
      <View style={styles.shell}>
        <View style={styles.panel}>
          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.panelContent}
            alwaysBounceVertical={false}
          >
            <Text style={styles.panelTitle}>Write down your seed</Text>
            <Text style={styles.panelBody}>
              These 12 words are the only way to recover your wallet.
            </Text>
            <View style={styles.seedWords}>
              {pendingSeed.split(' ').map((word, index) => (
                <Text key={word + index} style={styles.seedWord}>
                  {index + 1}. {word}
                </Text>
              ))}
            </View>
            <ActionButton
              label={copied ? 'Copied' : 'Copy'}
              variant="outlined"
              grow
              onPress={() => {
                Clipboard.setString(pendingSeed);
                setCopied(true);
              }}
            />
            <ActionButton
              label="I wrote it down"
              variant="primary"
              grow
              onPress={confirmRegister}
            />
          </ScrollView>
        </View>
        <VoiceFooter />
      </View>
    );
  }

  if (mode === 'connect-seed') {
    const normalizedSeed = validateSeed(seedInput);
    const invalidHint =
      seedInput.trim().length > 0 && normalizedSeed === null;
    return (
      <View style={styles.shell}>
        <View style={styles.panel}>
          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.panelContent}
            alwaysBounceVertical={false}
          >
            <Text style={styles.panelTitle}>Connect existing seed</Text>
            <Text style={styles.panelBody}>
              Enter the 12-word seed phrase of your wallet.
            </Text>
            <TextInput
              style={styles.seedInput}
              value={seedInput}
              onChangeText={setSeedInput}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Seed phrase"
              placeholder="12 words, separated by spaces"
              placeholderTextColor={theme.colors.textMuted}
            />
            {invalidHint && (
              <Text style={styles.invalidHint}>
                Enter a valid 12-word seed phrase.
              </Text>
            )}
            <View style={styles.buttonRow}>
              <ActionButton
                label="Go back"
                variant="outlined"
                grow
                onPress={() => setMode('welcome')}
              />
              <ActionButton
                label="Continue"
                variant="primary"
                grow
                disabled={normalizedSeed === null}
                onPress={confirmConnect}
              />
            </View>
          </ScrollView>
        </View>
        <VoiceFooter />
      </View>
    );
  }

  if (mode === 'unlocking') {
    return (
      <View style={styles.shell}>
        <View style={styles.panel}>
          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.panelContent}
            alwaysBounceVertical={false}
          >
            <Text style={styles.panelTitle}>Please wait</Text>
            <Text style={styles.panelBody}>Unlocking your wallet.</Text>
            <Text style={styles.panelBody}>Complete the fingerprint prompt.</Text>
            <ActivityIndicator
              color={theme.voiceStates.idle.ink}
              accessibilityLabel="Working"
            />
            <ActionButton
              label="Cancel"
              variant="outlined"
              grow
              onPress={cancelUnlock}
            />
          </ScrollView>
        </View>
        <VoiceFooter />
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.attentionPanel}>
        <ScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelContent}
          alwaysBounceVertical={false}
        >
          <Text style={styles.attentionTitle}>Needs attention</Text>
          <Text style={styles.panelBody}>Could not unlock your wallet.</Text>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Go back"
              variant="outlined"
              grow
              onPress={() => setMode('welcome')}
            />
            <ActionButton
              label="Try again"
              variant="primary"
              attention
              grow
              onPress={startUnlock}
            />
          </View>
        </ScrollView>
      </View>
      <VoiceFooter />
    </View>
  );
}

/** The design's static mic + "Say Repeat" hint anchored at the bottom. */
function VoiceFooter() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const Mic = theme.mode === 'dark' ? IdleDark : IdleLight;
  return (
    <View style={styles.voiceRegion}>
      <Mic width={layout.voiceViewport} height={layout.voiceViewport} />
      <Text style={styles.voiceHint}>Say “Repeat” to hear this again.</Text>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  shell: {
    flex: 1,
    width: '100%' as const,
    // Tablet: the reference frame stops at a phone-sized column, centred.
    maxWidth: designFrameWidth(),
    alignSelf: 'center' as const,
    paddingHorizontal: layout.screenPadding,
    paddingTop: scale(10),
    paddingBottom: scale(16),
    gap: layout.sectionGap,
  },
  header: {
    flex: 1,
    justifyContent: 'center' as const,
    gap: layout.rowGap / 2,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  headerBody: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  buttonStack: {
    gap: layout.rowGap,
  },
  panel: {
    flex: 1,
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    borderWidth: 1,
    borderColor: theme.voiceStates.idle.ink,
    backgroundColor: theme.voiceStates.idle.soft,
    paddingHorizontal: scale(10),
    paddingVertical: scale(10),
  },
  attentionPanel: {
    flex: 1,
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    borderWidth: 1,
    borderColor: theme.voiceStates.attention.ink,
    backgroundColor: theme.voiceStates.attention.soft,
    paddingHorizontal: scale(10),
    paddingVertical: scale(10),
  },
  panelContent: {
    flexGrow: 1,
    gap: layout.rowGap,
  },
  panelScroll: {
    flex: 1,
  },
  panelTitle: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  attentionTitle: {
    ...theme.typography.title,
    color: theme.voiceStates.attention.ink,
  },
  panelBody: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  seedWords: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: layout.rowGap,
  },
  seedWord: {
    ...theme.typography.body,
    color: theme.colors.text,
    width: '31%' as const,
  },
  seedInput: {
    ...theme.typography.body,
    minHeight: scale(96),
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    borderRadius: scale(5),
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: scale(10),
    textAlignVertical: 'top' as const,
  },
  invalidHint: {
    ...theme.typography.caption,
    color: theme.voiceStates.attention.ink,
  },
  buttonRow: {
    flexDirection: 'row' as const,
    gap: layout.rowGap,
  },
  voiceRegion: {
    alignItems: 'center' as const,
    gap: layout.rowGap / 2,
  },
  voiceHint: {
    ...theme.typography.caption,
    textAlign: 'center' as const,
  },
});
