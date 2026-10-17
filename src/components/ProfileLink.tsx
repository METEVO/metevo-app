import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import ProfileDark from '../assets/profile_dark.svg';
import ProfileLight from '../assets/profile_light.svg';
import {
  MetevoTheme,
  useTheme,
  useThemedStyles,
} from '../design/ThemeContext';
import { layout, scale } from './styles';

/** Intrinsic reference size from the profile asset SVG viewBox. */
const PROFILE_ICON_REFERENCE = { width: 15, height: 17 } as const;

/**
 * Top-left circular profile control of the design's status header.
 * TODO(phase 2): profile / settings flow (likely spoken, not visual).
 */
export function ProfileLink() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ProfileIcon = theme.mode === 'dark' ? ProfileDark : ProfileLight;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.avatar}
        onPress={() => undefined}
        accessibilityRole="button"
        accessibilityLabel="Profile"
      >
        <ProfileIcon
          width={scale(PROFILE_ICON_REFERENCE.width)}
          height={scale(PROFILE_ICON_REFERENCE.height)}
        />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  row: {
    alignItems: 'flex-start' as const,
  },
  avatar: {
    width: layout.avatar,
    height: layout.avatar,
    borderRadius: layout.avatar / 2,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
