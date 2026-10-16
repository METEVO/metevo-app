import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, layout, typography } from './styles';

/**
 * Top-left circular profile placeholder of the sketch.
 * TODO(phase 2): profile / settings screen (likely spoken, not visual).
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
        <Text style={typography.body}>A</Text>
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
