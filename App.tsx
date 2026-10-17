import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemePreferenceProvider, useThemePreference } from './src/design/ThemeContext';
import { HomeScreen } from './src/screens/HomeScreen';

/**
 * App root.
 *
 * METEVO is one flow, not an app with sections: a single screen, no router.
 * All structure lives in `HomeScreen` and its child components.
 *
 * Safe areas come from react-native-safe-area-context: React Native's
 * built-in SafeAreaView is deprecated and is a no-op on Android (content
 * would render under the status bar).
 */
export default function App() {
  return (
    <ThemePreferenceProvider>
      <AppRoot />
    </ThemePreferenceProvider>
  );
}

function AppRoot() {
  const { theme } = useThemePreference();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <HomeScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
