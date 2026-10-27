import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import AudioOnDark from '../assets/audio_on_dark.svg';
import AudioOnLight from '../assets/audio_on_light.svg';
import LogoMarkDark from '../assets/logo_mark_dark.svg';
import LogoMarkLight from '../assets/logo_mark_light.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { metevoDesignTokens } from '../design/designTokens';
import { scale } from './styles';
import { ProfileLink } from './ProfileLink';

/** Intrinsic reference sizes from the design asset SVG viewBoxes. */
const AUDIO_ICON_REFERENCE = { width: 16, height: 15 } as const;
const LOGO_REFERENCE = { width: 44, height: 23 } as const;

export type WalletConnectionState = 'connected' | 'offline' | 'closed';

const CONNECTION_LABELS: Record<WalletConnectionState, string> = {
  connected: 'Wallet connected',
  offline: 'Wallet offline',
  closed: 'No wallet open',
};

interface StatusHeaderProps {
  connection: WalletConnectionState;
}

/**
 * Fixed top shell region of the design: the profile chip and the audio
 * state chip, then the wallet connection state with the DEMO marker.
 *
 * The audio toggle keeps its foundation-phase placeholder press behavior;
 * the design handoff assigns audio state ownership to the existing audio
 * pipeline and forbids silently overriding the user's audio setting.
 */
export function StatusHeader({ connection }: StatusHeaderProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  const AudioOnIcon = theme.mode === 'dark' ? AudioOnDark : AudioOnLight;
  const LogoMark = theme.mode === 'dark' ? LogoMarkDark : LogoMarkLight;

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <ProfileLink />
        <LogoMark
          width={scale(LOGO_REFERENCE.width)}
          height={scale(LOGO_REFERENCE.height)}
          accessibilityLabel="METEVO"
        />
        <TouchableOpacity
          style={styles.audioChip}
          onPress={() => undefined}
          accessibilityRole="button"
          accessibilityLabel="Audio on"
          accessibilityState={{ checked: true }}
        >
          <AudioOnIcon
            width={scale(AUDIO_ICON_REFERENCE.width)}
            height={scale(AUDIO_ICON_REFERENCE.height)}
          />
          <Text style={styles.audioLabel}>Audio on</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <Text style={styles.connectionState}>{CONNECTION_LABELS[connection]}</Text>
        <Text style={styles.demo}>DEMO</Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  stack: {
    gap: scale(8),
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  audioChip: {
    minHeight: scale(metevoDesignTokens.layout.actionHeight),
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: scale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.background,
  },
  audioLabel: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  connectionState: theme.typography.caption,
  demo: theme.typography.micro,
});
