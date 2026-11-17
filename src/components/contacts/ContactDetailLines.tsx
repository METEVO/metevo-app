import React from 'react';
import { Text } from 'react-native';

import { useTheme } from '../../design/ThemeContext';

export function ContactDetailLines({ phone, email }: { phone?: string; email?: string }) {
  const theme = useTheme();
  return (
    <>
      {phone !== undefined && (
        <Text style={theme.typography.body} selectable accessibilityLabel={`Phone ${phone}`}>{phone}</Text>
      )}
      {email !== undefined && (
        <Text style={theme.typography.body} selectable accessibilityLabel={`Email ${email}`}>{email}</Text>
      )}
    </>
  );
}
