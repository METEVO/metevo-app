import { metevoDesignTokens } from '../design/designTokens';
import { scale } from '../design/theme';

export { scale };

/**
 * Theme-free geometry constants. Palette-dependent values (colors,
 * typography, cardBase, voiceStates) live in src/design/theme.ts; consume
 * them through useTheme() from src/design/ThemeContext.
 */

/** tokens.runtimeGuidance.touchTarget: minimum 48x48 logical pixels. */
const MIN_TOUCH_TARGET = 48;

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
  /** tokens.accessibility.assetViewBox is "-8 -8 80 80": the voice assets
   * render at their full viewport so the state outlines keep clearance. */
  voiceViewport: scale(80),
} as const;
