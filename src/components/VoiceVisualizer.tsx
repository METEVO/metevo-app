import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, layout } from './styles';

const BAR_COUNT = 7;

interface VoiceVisualizerProps {
  /** Latest mic level in dB (-160..0); null while idle. */
  levelDb: number | null;
}

/**
 * Minimal amplitude visualizer: bar heights follow the mic level.
 * Pure `View` + height styles - no SVG, no reanimated, no extra
 * dependencies, so it stays cheap on low-end devices.
 */
export function VoiceVisualizer({ levelDb }: VoiceVisualizerProps) {
  const bars = Array.from({ length: BAR_COUNT }, (_, index) => barHeight(index, levelDb));

  return (
    <View style={styles.row}>
      {bars.map((height, index) => (
        <View key={index} style={[styles.bar, { height }]} />
      ))}
    </View>
  );
}

/** Map one bar index + level to a height; the shape peeks in the middle. */
function barHeight(index: number, levelDb: number | null): number {
  if (levelDb === null) {
    return layout.dot;
  }
  const center = (BAR_COUNT - 1) / 2;
  const shape = 1 - Math.abs(index - center) / center;
  const loudness = (levelDb + 160) / 160;
  return layout.dot + shape * loudness * layout.visualizerMaxBar;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.rowGap / 4,
  },
  bar: {
    width: 4,
    minHeight: layout.dot,
    maxHeight: layout.visualizerMaxBar,
    backgroundColor: colors.accentText,
    borderRadius: 2,
  },
});
