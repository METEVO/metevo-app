import React, { useMemo } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { metevoDesignTokens } from '../../design/designTokens';
import { MetevoTheme, useThemedStyles } from '../../design/ThemeContext';
import { useSwapFlow } from '../../hooks/useSwapFlow';
import { parseSwapStart } from '../../services/swap/swapPayload';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { IntentCardProps } from './IntentCard';

export function SwapCard({ payload, onClearIntent }: IntentCardProps) {
  const start = useMemo(() => parseSwapStart(payload), [payload]);
  const { flow, state, enabled } = useSwapFlow(start);
  const styles = useThemedStyles(makeStyles);
  const busy = ['quoting', 'authorizing', 'executing'].includes(state.stage);
  return (
    <ScrollView contentContainerStyle={styles.canvas} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Buy USDm</Text>
      <Text style={styles.body}>Pay with sats to receive USDm.</Text>
      {!enabled && <Text style={styles.notice}>Buying USDm is not enabled on this build.</Text>}
      {state.stage === 'entry' && <>
        <Text style={styles.body}>Whole USDm to receive</Text>
        <TextInput style={styles.amountInput} value={state.draft} keyboardType="number-pad"
          accessibilityLabel="Whole USDm to receive" editable={enabled}
          onChangeText={(text) => flow.setDraft(text)} />
        <ActionButton label="Review quote" variant="primary" disabled={!enabled} onPress={() => void flow.review()} />
      </>}
      {state.quote !== null && <View style={styles.header}>
        <Text style={styles.value}>You pay: {state.quote.sats} sats</Text>
        <Text style={styles.value}>You receive: {state.quote.usdAmount} USDm</Text>
        <Text style={styles.body}>Rate: {state.quote.satsPerUsd} sats per USDm</Text>
        <Text style={styles.caption}>Fees are not quoted separately by the LSP. Wallet network fees may apply.</Text>
        <Text style={styles.body}>Quote expires: {new Date(state.quote.expiresAt).toLocaleTimeString('en-GB')}</Text>
      </View>}
      {state.note !== null && <Text accessibilityLiveRegion="polite" style={styles.body}>{state.note}</Text>}
      {state.stage === 'review' && <View style={styles.actions}>
        <ActionButton label="Back" variant="outlined" onPress={() => flow.edit()} grow />
        <ActionButton label="Confirm purchase" variant="primary" disabled={!enabled} onPress={() => void flow.confirm()} grow />
      </View>}
      {busy && <Text accessibilityLiveRegion="polite" style={styles.body}>
        {state.stage === 'quoting' ? 'Getting your quote…' : state.stage === 'authorizing' ? 'Waiting for confirmation…' : 'Checking payment and USDm delivery…'}
      </Text>}
      {state.stage === 'pending' && <ActionButton label="Check saved purchase" variant="primary" onPress={() => void flow.resume()} />}
      {state.stage === 'failed' && <ActionButton label="Back to amount" variant="outlined" onPress={() => flow.edit()} />}
      <ActionButton label={state.stage === 'completed' ? 'Done' : 'Close'} variant="outlined" onPress={() => onClearIntent?.()} />
    </ScrollView>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  panel: {
    flex: 1,
    justifyContent: 'space-between' as const,
    gap: layout.rowGap,
  },
  header: {
    gap: layout.rowGap / 2,
  },
  canvas: {
    width: '100%' as const,
    gap: layout.rowGap,
  },
  centered: {
    width: '100%' as const,
    alignItems: 'center' as const,
    gap: layout.rowGap,
  },
  title: {
    ...theme.typography.title,
    color: theme.voiceStates.idle.ink,
  },
  errorTitle: {
    color: theme.voiceStates.attention.ink,
  },
  body: theme.typography.body,
  caption: theme.typography.caption,
  notice: {
    ...theme.typography.body,
    fontWeight: '700' as const,
    color: theme.voiceStates.attention.ink,
  },
  amountInput: {
    ...theme.typography.body,
    minHeight: scale(metevoDesignTokens.layout.actionHeight),
    paddingHorizontal: scale(8),
    borderRadius: scale(metevoDesignTokens.layout.cardRadius),
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: layout.rowGap,
  },
  value: {
    ...theme.typography.body,
    fontWeight: '700' as const,
  },
  rejection: {
    ...theme.typography.caption,
    color: theme.voiceStates.attention.ink,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: scale(metevoDesignTokens.layout.pairedActionGap),
  },
});
