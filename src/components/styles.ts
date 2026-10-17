import { Dimensions, StyleSheet, type TextStyle } from 'react-native';

import { metevoDesignTokens } from '../design/designTokens';

/**
 * Visual language derived from the METEVO design handoff (src/design).
 * Every value comes from the design tokens; nothing is hand-picked here.
 *
 * Fonts: the handoff specifies Arial, but font files are not licensed for
 * bundling (see the design package README), so components keep the system
 * font. Voice state colors follow the launch (dark) theme palette.
 */

const palettes = {
  dark: metevoDesignTokens.dark,
  light: metevoDesignTokens.light,
} as const;

export type ThemeMode = keyof typeof palettes;

const REFERENCE_FRAME_WIDTH = metevoDesignTokens.referenceFrame.width;

/** tokens.runtimeGuidance.touchTarget: minimum 48x48 logical pixels. */
const MIN_TOUCH_TARGET = 48;

/**
 * tokens.runtimeGuidance.scaleFormula: reference SVG units to logical
 * pixels. Portrait is locked in app.json, so the window width is measured
 * once at module init; OS font scaling still applies to Text elements.
 */
const scaleFactor = Dimensions.get('window').width / REFERENCE_FRAME_WIDTH;

export const scale = (referenceUnits: number): number =>
  referenceUnits * scaleFactor;

/** Token weights are numeric; TextStyle.fontWeight is a literal union. */
function textStyleWeight(tokenWeight: number): TextStyle['fontWeight'] {
  return tokenWeight === 700 ? '700' : '400';
}

export const colors = {
  background: palettes.dark.background,
  surface: palettes.dark.surface,
  border: palettes.dark.border,
  text: palettes.dark.text,
  textMuted: palettes.dark.muted,
  accent: palettes.dark.states.idle.fill,
  accentText: palettes.dark.onAccent,
} as const;

/** Per-state colors from the launch palette: fill, ink and soft surface. */
export const voiceStates = palettes.dark.states;

export const layout = {
  screenPadding: scale(metevoDesignTokens.layout.balance.x),
  rowGap: 8,
  sectionGap: 16,
  dot: 6,
  visualizerMaxBar: 40,
  avatar: 40,
  cardMinHeight: scale(metevoDesignTokens.layout.taskCanvas.height),
  primaryButton: scale(metevoDesignTokens.layout.mainVoice.radius * 2),
  secondaryButton: Math.max(
    MIN_TOUCH_TARGET,
    scale(metevoDesignTokens.layout.bottomControls.height),
  ),
} as const;

export const typography = {
  title: {
    fontSize: scale(metevoDesignTokens.typography.title.size),
    fontWeight: textStyleWeight(metevoDesignTokens.typography.title.weight),
    color: colors.text,
  },
  body: {
    fontSize: scale(metevoDesignTokens.typography.body.size),
    fontWeight: textStyleWeight(metevoDesignTokens.typography.body.weight),
    color: colors.text,
  },
  caption: {
    fontSize: scale(metevoDesignTokens.typography.label.size),
    fontWeight: textStyleWeight(metevoDesignTokens.typography.label.weight),
    color: colors.textMuted,
  },
} as const;

/** Shared "card" chrome for balance boxes, links and intent cards. */
export const cardBase = {
  backgroundColor: colors.surface,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  borderRadius: scale(metevoDesignTokens.layout.cardRadius),
  padding: 12,
} as const;
