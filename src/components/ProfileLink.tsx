import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import ProfileIcon from '../assets/profile_dark.svg';
import { colors, layout, scale } from './styles';

/** Intrinsic reference size from the profile asset SVG viewBox. */
const PROFILE_ICON_REFERENCE = { width: 15, height: 17 } as const;

/**
 * Top-left circular profile control of the design's status header.
 * TODO(phase 2): profile / settings flow (likely spoken, not visual).
 */
export function ProfileLink() {
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

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: layout.avatar,
    height: layout.avatar,
    borderRadius: layout.avatar / 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
