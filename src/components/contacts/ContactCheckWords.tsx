import React from 'react';
import { Text } from 'react-native';

import { useTheme } from '../../design/ThemeContext';
import { contactCheckWords } from '../../services/metevo/contactCheckWords';
import { isValidNodePubkey } from '../../services/metevo/contacts';

/** The four words both people compare aloud before trusting a contact. */
export function ContactCheckWords({ nodePubkey }: { nodePubkey: string }) {
  const theme = useTheme();
  if (!isValidNodePubkey(nodePubkey)) return null;
  const words = contactCheckWords(nodePubkey);
  return (
    <Text
      style={[theme.typography.caption, { color: theme.colors.text }]}
      accessibilityLabel={`Check words: ${words.join(', ')}`}
    >
      Check words: <Text style={{ fontWeight: '700' }}>{words.join(' · ')}</Text>
    </Text>
  );
}
