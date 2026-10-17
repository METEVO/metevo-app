import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { UiLanguage } from '../../hooks/useWalletSession';
import {
  startSpokenOptionHighlight,
  stopSpokenOptionHighlight,
} from '../../services/spokenInteraction';
import { cardBase, colors, layout, scale, typography, voiceStates } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { OnboardingVoice } from './OnboardingVoice';

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

const LISTENING_MESSAGE = 'Listening...';
const LISTENING_HINT = 'Tap the mic to stop.';

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
  const [hearing, setHearing] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
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

  const toggleHearing = useCallback(() => {
    if (hearing) {
      stopSpokenOptionHighlight();
      setSpokenIndex(null);
      setHearing(false);
      return;
    }
    startSpokenOptionHighlight(LANGUAGE_ORDER.length, setSpokenIndex);
    setHearing(true);
  }, [hearing]);

  return (
    <View style={styles.fill}>
      <Text style={typography.title}>Choose your language</Text>
      <Text style={typography.body}>Select a language or say its name.</Text>

      <ScrollView contentContainerStyle={styles.optionList}>
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
      </ScrollView>

      {voiceListening && (
        <View style={styles.listeningBlock}>
          <Text style={typography.body}>{LISTENING_MESSAGE}</Text>
          <Text style={typography.caption}>{LISTENING_HINT}</Text>
        </View>
      )}

      <OnboardingVoice
        listening={voiceListening}
        onToggle={() => setVoiceListening((current) => !current)}
      />

      <View style={styles.actions}>
        <ActionButton
          label={hearing ? 'Stop reading' : 'Hear options'}
          variant="outlined"
          onPress={toggleHearing}
          grow
        />
        <ActionButton
          label="Continue"
          variant="primary"
          onPress={onContinue}
          disabled={selected === null}
          grow
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    gap: layout.rowGap,
  },
  optionList: {
    gap: layout.rowGap,
    flexGrow: 1,
    justifyContent: 'center',
  },
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
  listeningBlock: {
    alignItems: 'center',
    gap: layout.rowGap / 4,
  },
  actions: {
    flexDirection: 'row',
    gap: layout.rowGap,
  },
});
