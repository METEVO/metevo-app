import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AudioOnIcon from '../assets/audio_on_dark.svg';
import LogoMark from '../assets/logo_mark_dark.svg';
import { layout, scale, typography } from './styles';
import { ProfileLink } from './ProfileLink';

/** Intrinsic reference sizes from the design asset SVG viewBoxes. */
const LOGO_MARK_REFERENCE = { width: 44, height: 23 } as const;
const AUDIO_ICON_REFERENCE = { width: 16, height: 15 } as const;

const CONNECTED_LABEL = 'Wallet connected';
const DISCONNECTED_LABEL = 'No wallet open';

interface StatusHeaderProps {
  walletConnected: boolean;
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
export function StatusHeader({ walletConnected }: StatusHeaderProps) {
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
      <Text style={styles.connectionState}>
        {walletConnected ? CONNECTED_LABEL : DISCONNECTED_LABEL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: layout.rowGap / 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioToggle: {
    width: layout.secondaryButton,
    height: layout.secondaryButton,
    borderRadius: layout.secondaryButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionState: {
    ...typography.caption,
    textAlign: 'center',
  },
});
