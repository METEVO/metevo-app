import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AudioOnDark from '../assets/audio_on_dark.svg';
import AudioOnLight from '../assets/audio_on_light.svg';
import LogoMarkDark from '../assets/logo_mark_dark.svg';
import LogoMarkLight from '../assets/logo_mark_light.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { layout, scale } from './styles';
import { ProfileLink } from './ProfileLink';

/** Intrinsic reference sizes from the design asset SVG viewBoxes. */
const LOGO_MARK_REFERENCE = { width: 44, height: 23 } as const;
const AUDIO_ICON_REFERENCE = { width: 16, height: 15 } as const;

export type WalletConnectionState = 'connected' | 'offline' | 'closed';

const CONNECTION_LABELS: Record<WalletConnectionState, string> = {
  connected: 'Wallet connected',
  offline: 'Wallet node unreachable',
  closed: 'No wallet open',
};

interface StatusHeaderProps {
  connection: WalletConnectionState;
}

/**
 * Fixed top shell region: profile on the left, the METEVO mark centered,
 * and the audio state toggle on the right, with the wallet connection
 * state underneath.
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
          width={scale(LOGO_MARK_REFERENCE.width)}
          height={scale(LOGO_MARK_REFERENCE.height)}
        />
        <TouchableOpacity
          style={styles.audioToggle}
          onPress={() => undefined}
          accessibilityRole="button"
          accessibilityLabel="Audio on or off"
          accessibilityState={{ checked: true }}
        >
          <AudioOnIcon
            width={scale(AUDIO_ICON_REFERENCE.width)}
            height={scale(AUDIO_ICON_REFERENCE.height)}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.connectionState}>{CONNECTION_LABELS[connection]}</Text>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  stack: {
    gap: layout.rowGap / 4,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  audioToggle: {
    width: layout.secondaryButton,
    height: layout.secondaryButton,
    borderRadius: layout.secondaryButton / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  connectionState: {
    ...theme.typography.caption,
    textAlign: 'center' as const,
  },
});
