import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet } from 'react-native';

import { createTheme, MetevoTheme, ThemeMode } from './theme';

export type { MetevoTheme, ThemeMode };

interface ThemePreference {
  theme: MetevoTheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemePreference | null>(null);

/**
 * Holds the app-wide theme preference. Onboarding's theme step sets the
 * preference immediately, so the whole screen previews the candidate
 * palette live; Continue simply accepts what is already on screen.
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const theme = useMemo(() => createTheme(mode), [mode]);

  const preference = useMemo(
    () => ({ theme, setThemeMode: setMode }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={preference}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreference(): ThemePreference {
  const preference = useContext(ThemeContext);
  if (preference === null) {
    throw new Error('useThemePreference requires ThemePreferenceProvider');
  }
  return preference;
}

export function useTheme(): MetevoTheme {
  return useThemePreference().theme;
}

/** Builds the component styles from the current theme; memoized on it. */
export function useThemedStyles<
  S extends StyleSheet.NamedStyles<S>,
>(makeStyles: (theme: MetevoTheme) => S): S {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(makeStyles(theme)), [makeStyles, theme]);
}
