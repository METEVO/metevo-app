import { StyleSheet } from 'react-native';

/**
 * Wireframe-only visual language: plain shapes and basic colors, no design
 * system. Production styling is out of scope for the foundation phase.
 */

export const colors = {
  background: '#f4f4f4',
  surface: '#ffffff',
  border: '#cccccc',
  text: '#111111',
  textMuted: '#666666',
  accent: '#2f6fed',
  accentText: '#ffffff',
  danger: '#d9534f',
} as const;

export const layout = {
  screenPadding: 16,
  rowGap: 8,
  sectionGap: 16,
  dot: 6,
  visualizerMaxBar: 40,
  avatar: 40,
  cardMinHeight: 120,
  primaryButton: 96,
  secondaryButton: 56,
} as const;

export const typography = {
  title: { fontSize: 20, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, color: colors.text },
  caption: { fontSize: 12, color: colors.textMuted },
  primaryLabel: { fontSize: 18, fontWeight: '700', color: colors.accentText },
} as const;

/** Shared "card" chrome for balance boxes, links and intent cards. */
export const cardBase = {
  backgroundColor: colors.surface,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  borderRadius: 8,
  padding: 12,
} as const;
