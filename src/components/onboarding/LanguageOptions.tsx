import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { UiLanguage } from '../../hooks/useWalletSession';
import { cardBase, colors, layout, scale, typography, voiceStates } from '../styles';
import { OnboardingFrame } from './OnboardingFrame';

const VISIBLE_OPTION_COUNT = 4;

const LANGUAGE_LABELS: Record<UiLanguage, string> = {
  english: 'English',
  italiano: 'Italiano',
  turkce: 'Türkçe',
  francais: 'Français',
  hindi: 'हिन्दी',
  espanol: 'Español',
  kiswahili: 'Kiswahili',
};

const LANGUAGE_ORDER = Object.keys(LANGUAGE_LABELS) as UiLanguage[];

interface LanguageOptionsProps {
  selected: UiLanguage | null;
  onSelect: (language: UiLanguage) => void;
  onContinue: () => void;
}

/**
 * Design sections 25/26: seven languages, four visible at a time. Touch or
 * a recognized spoken name selects; the spoken highlight from the audio
 * phase never selects. Continue accepts the selection explicitly.
 */
export function LanguageOptions({ selected, onSelect, onContinue }: LanguageOptionsProps) {
  const [spokenIndex, setSpokenIndex] = useState<number | null>(null);

  const windowStart = useMemo(() => {
    if (selected === null) {
      return 0;
    }
    const selectedIndex = LANGUAGE_ORDER.indexOf(selected);
    return Math.min(
      Math.max(selectedIndex - (VISIBLE_OPTION_COUNT - 1), 0),
      LANGUAGE_ORDER.length - VISIBLE_OPTION_COUNT,
    );
  }, [selected]);

  const visibleLanguages = LANGUAGE_ORDER.slice(
    windowStart,
    windowStart + VISIBLE_OPTION_COUNT,
  );

  return (
    <OnboardingFrame
      title="Choose your language"
      subtitle="Select a language or say its name."
      hearOptionCount={LANGUAGE_ORDER.length}
      hearHighlight={setSpokenIndex}
      onConfirm={onContinue}
      confirmDisabled={selected === null}
    >
      {visibleLanguages.map((language, visibleIndex) => (
        <TouchableOpacity
          key={language}
          style={[
            styles.option,
            selected === language && styles.optionSelected,
            spokenIndex === visibleIndex && styles.optionSpoken,
          ]}
          onPress={() => onSelect(language)}
          accessibilityRole="button"
          accessibilityLabel={LANGUAGE_LABELS[language]}
          accessibilityState={{ selected: selected === language }}
        >
          <Text style={styles.optionLabel}>{LANGUAGE_LABELS[language]}</Text>
        </TouchableOpacity>
      ))}
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  option: {
    ...cardBase,
    minHeight: scale(14.16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  optionSpoken: {
    borderColor: voiceStates.idle.fill,
  },
  optionLabel: typography.body,
});
