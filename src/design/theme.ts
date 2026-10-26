import { Dimensions, StyleSheet, type TextStyle } from 'react-native';

import { metevoDesignTokens } from './designTokens';

export type ThemeMode = 'dark' | 'light';

export interface MetevoThemeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
}

export interface VoiceStateColors {
  fill: string;
  ink: string;
  soft: string;
}

export type VoiceStates = Record<
  'idle' | 'listening' | 'processing' | 'success' | 'attention',
  VoiceStateColors
>;

export interface MetevoTheme {
  mode: ThemeMode;
  colors: MetevoThemeColors;
  voiceStates: VoiceStates;
  typography: {
    title: TextStyle;
    body: TextStyle;
    caption: TextStyle;
  };
  cardBase: {
    backgroundColor: string;
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    padding: number;
  };
}

const REFERENCE_FRAME_WIDTH = metevoDesignTokens.referenceFrame.width;

/**
 * tokens.runtimeGuidance.scaleFormula: reference SVG units to logical
 * pixels. Portrait is locked in app.json, so the window width is measured
 * once at module init; OS font scaling still applies to Text elements.
 */
export const scale = (referenceUnits: number): number =>
  (referenceUnits * Dimensions.get('window').width) / REFERENCE_FRAME_WIDTH;

/** Token weights are numeric; TextStyle.fontWeight is a literal union. */
function textStyleWeight(tokenWeight: number): TextStyle['fontWeight'] {
  return tokenWeight === 700 ? '700' : '400';
}

/** Builds the full palette-dependent token set for one theme mode. */
export function createTheme(mode: ThemeMode): MetevoTheme {
  const palette = metevoDesignTokens[mode];
  const typeTokens = metevoDesignTokens.typography;

  return {
    mode,
    colors: {
      background: palette.background,
      surface: palette.surface,
      border: palette.border,
      text: palette.text,
      textMuted: palette.muted,
      accent: palette.states.idle.fill,
      accentText: palette.onAccent,
    },
    voiceStates: palette.states,
    typography: {
      title: {
        fontSize: scale(typeTokens.title.size),
        fontWeight: textStyleWeight(typeTokens.title.weight),
        color: palette.text,
      },
      body: {
        fontSize: scale(typeTokens.body.size),
        fontWeight: textStyleWeight(typeTokens.body.weight),
        color: palette.text,
      },
      caption: {
        fontSize: scale(typeTokens.label.size),
        fontWeight: textStyleWeight(typeTokens.label.weight),
        color: palette.muted,
      },
    },
    cardBase: {
      backgroundColor: palette.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      borderRadius: scale(metevoDesignTokens.layout.cardRadius),
      padding: 12,
    },
  };
}
