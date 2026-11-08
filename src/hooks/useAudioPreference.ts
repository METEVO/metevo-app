import { useCallback, useEffect, useState } from 'react';

import {
  isAudioEnabled,
  loadAudioPreference,
  setAudioEnabled,
  subscribeAudioPreference,
} from '../services/audioPreference';
import { stopSpeaking } from '../utils/speaker';

/** Live "Audio on / off" state; turning audio off silences the current sentence. */
export function useAudioPreference() {
  const [enabled, setEnabled] = useState(isAudioEnabled);

  useEffect(() => {
    const unsubscribe = subscribeAudioPreference(setEnabled);
    void loadAudioPreference().then(() => setEnabled(isAudioEnabled()));
    return unsubscribe;
  }, []);

  const toggle = useCallback(() => {
    const next = !isAudioEnabled();
    if (!next) {
      stopSpeaking();
    }
    setAudioEnabled(next);
  }, []);

  return { enabled, toggle };
}
