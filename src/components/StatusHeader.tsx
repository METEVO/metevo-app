import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import AudioOffDark from '../assets/audio_off_dark.svg';
import AudioOffLight from '../assets/audio_off_light.svg';
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
import { useAudioPreference } from '../hooks/useAudioPreference';
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
  onOpenProfile: () => void;
}

/**
 * Fixed top shell region of the design: the profile chip and the audio
 * state chip, then the wallet connection state with the DEMO marker.
 *
 * The audio chip is the user's own spoken-output switch: it is only ever
 * changed by a tap here, never by the app.
 */
export function StatusHeader({ connection, onOpenProfile }: StatusHeaderProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  const audio = useAudioPreference();
  const audioLabel = audio.enabled ? 'Audio on' : 'Audio off';
  const AudioIcon = audio.enabled
    ? theme.mode === 'dark' ? AudioOnDark : AudioOnLight
    : theme.mode === 'dark' ? AudioOffDark : AudioOffLight;
  const LogoMark = theme.mode === 'dark' ? LogoMarkDark : LogoMarkLight;

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        <ProfileLink onPress={onOpenProfile} />
        <LogoMark
          width={scale(LOGO_REFERENCE.width)}
          height={scale(LOGO_REFERENCE.height)}
          accessibilityLabel="METEVO"
        />
        <TouchableOpacity
          style={styles.audioChip}
          onPress={audio.toggle}
          accessibilityRole="switch"
          accessibilityLabel="Audio"
          accessibilityState={{ checked: audio.enabled }}
        >
          <AudioIcon
            width={scale(AUDIO_ICON_REFERENCE.width)}
            height={scale(AUDIO_ICON_REFERENCE.height)}
          />
          <Text style={styles.audioLabel}>{audioLabel}</Text>
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
