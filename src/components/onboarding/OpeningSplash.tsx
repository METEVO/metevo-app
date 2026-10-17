import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import LogoLockup from '../../assets/logo_lockup_dark.svg';
import { layout, scale, typography } from '../styles';

/** Intrinsic reference size of the logo lockup asset viewBox. */
const LOGO_LOCKUP_REFERENCE = { width: 117.04, height: 68.78 } as const;

const TAGLINE = 'YOUR MONEY. YOUR VOICE.';

interface OpeningSplashProps {
  onContinue: () => void;
}

/**
 * Design screen 00: the launch screen. The lockup is the supplied vector
 * artwork (never typed text); the tagline is live text. Tap anywhere to
 * continue into onboarding.
 */
export function OpeningSplash({ onContinue }: OpeningSplashProps) {
  return (
    <Pressable
      style={styles.fill}
      onPress={onContinue}
      accessibilityRole="button"
      accessibilityLabel="Start METEVO"
    >
      <LogoLockup
        width={scale(LOGO_LOCKUP_REFERENCE.width)}
        height={scale(LOGO_LOCKUP_REFERENCE.height)}
      />
      <Text style={styles.tagline}>{TAGLINE}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.sectionGap,
  },
  tagline: typography.title,
});
