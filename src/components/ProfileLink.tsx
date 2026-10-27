import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import ProfileDark from '../assets/profile_dark.svg';
import ProfileLight from '../assets/profile_light.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { metevoDesignTokens } from '../design/designTokens';
import { scale } from './styles';

/** Intrinsic reference size from the profile asset SVG viewBox. */
const PROFILE_ICON_REFERENCE = { width: 15, height: 17 } as const;

/**
 * Top-left profile control of the design's status header: a labelled chip,
 * not a floating avatar. TODO(phase 2): profile / settings flow.
 */
export function ProfileLink() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ProfileIcon = theme.mode === 'dark' ? ProfileDark : ProfileLight;

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={() => undefined}
      accessibilityRole="button"
      accessibilityLabel="Profile"
    >
      <ProfileIcon
        width={scale(PROFILE_ICON_REFERENCE.width)}
        height={scale(PROFILE_ICON_REFERENCE.height)}
      />
      <Text style={styles.label}>Profile</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  chip: {
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
  label: theme.typography.body,
});
