import React, { useMemo } from 'react';
import { Text, TextInput, View } from 'react-native';

import AttentionVoice from '../../assets/voice_attention_dark.svg';
import ProcessingVoice from '../../assets/voice_processing_dark.svg';
import SuccessVoice from '../../assets/voice_success_dark.svg';
import { metevoDesignTokens } from '../../design/designTokens';
import { MetevoTheme, useThemedStyles } from '../../design/ThemeContext';
import { useSwapFlow } from '../../hooks/useSwapFlow';
import { useWalletSession } from '../../hooks/useWalletSession';
import { SIMULATION_NOTICE, SwapFlowStart, describeQuote } from '../../services/swap/swapFlow';
import { parseSwapStart } from '../../services/swap/swapPayload';
import {
  SIMULATED_FEE_BASIS_POINTS,
  SIMULATED_SATS_PER_USDM,
  BtcUnit,
  SwapAsset,
  SwapQuote,
  convertAtExampleRate,
  formatSatsAsBtc,
  formatSwapAmount,
  inputAsset,
  outputAsset,
  parseSwapAmount,
  usdmCentsFromBaseUnits,
} from '../../services/swap/swapQuote';
import { useAttentionSignal } from '../AttentionSignal';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';
import { IntentCardProps } from './IntentCard';

const ASSET_LABEL = { USDM: 'USDm', BTC: 'BTC' } as const;
const AMOUNT_LABEL = { USDM: 'Amount in USDm', SATS: 'Amount in sats', BTC: 'Amount in BTC' } as const;
const RATE_NOTE = `Example rate: 1 USDm = ${SIMULATED_SATS_PER_USDM.toLocaleString('en-US')} sats, fee ${
  SIMULATED_FEE_BASIS_POINTS / 100
}%. Not a market price.`;

/**
 * USDm <-> BTC swap, simulation only: the same card opens from the idle
 * menu and from a spoken "swap" command. No wallet method is ever called;
 * balances and history stay untouched.
 */
export function SwapCard(props: IntentCardProps) {
  const start = useMemo(() => parseSwapStart(props.payload), [props.payload]);
  return (
    <SwapPanel
      key={`${start.direction}:${start.draft}:${start.btcUnit}`}
      start={start}
      {...props}
    />
  );
}

function SwapPanel({ start, onClearIntent }: { start: SwapFlowStart } & IntentCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { flow, state, restart } = useSwapFlow(start);
  const { wallet } = useWalletSession();
  useAttentionSignal(state.stage === 'failed');

  const notice = <Text style={styles.notice}>{SIMULATION_NOTICE}</Text>;

  if (state.stage === 'entry') {
    const from = inputAsset(state.direction);
    const to = outputAsset(state.direction);
    const typedUnit = from === 'USDM' ? 'USDM' : state.btcUnit;
    return (
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Swap</Text>
          {notice}
          <View style={styles.row}>
            <Text style={styles.value}>
              {ASSET_LABEL[from]} → {ASSET_LABEL[to]}
            </Text>
            <ActionButton label="Reverse" variant="outlined" onPress={() => flow.reverse()} />
          </View>
          {from === 'BTC' && (
            <View style={styles.actions}>
              <ActionButton
                label="sats"
                variant="outlined"
                selected={state.btcUnit === 'SATS'}
                onPress={() => flow.setBtcUnit('SATS')}
                grow
              />
              <ActionButton
                label="BTC"
                variant="outlined"
                selected={state.btcUnit === 'BTC'}
                onPress={() => flow.setBtcUnit('BTC')}
                grow
              />
            </View>
          )}
          <Text style={styles.body}>{AMOUNT_LABEL[typedUnit]}</Text>
          <TextInput
            style={styles.amountInput}
            value={state.draft}
            onChangeText={(text) => flow.setDraft(text)}
            keyboardType={typedUnit === 'SATS' ? 'number-pad' : 'decimal-pad'}
            accessibilityLabel={AMOUNT_LABEL[typedUnit]}
            selectTextOnFocus
          />
          <BtcEquivalent draft={state.draft} from={from} btcUnit={state.btcUnit} />
          <Text style={styles.caption}>{RATE_NOTE}</Text>
          {state.note !== null && <Text style={styles.rejection}>{state.note}</Text>}
        </View>
        <View style={styles.actions}>
          <ActionButton label="Cancel" variant="outlined" onPress={() => onClearIntent?.()} grow />
          <ActionButton
            label="Review"
            variant="primary"
            onPress={() => flow.review(availableBalance(wallet, from))}
            grow
          />
        </View>
      </View>
    );
  }

  if (state.stage === 'review') {
    return (
      <View style={styles.canvas}>
        <Text style={styles.title}>Review the swap</Text>
        {notice}
        <QuoteRows quote={state.quote} />
        {state.balanceWarning !== null && (
          <Text style={styles.rejection}>{state.balanceWarning}</Text>
        )}
        {state.note !== null && <Text style={styles.rejection}>{state.note}</Text>}
        <View style={styles.actions}>
          <ActionButton label="Back" variant="outlined" onPress={() => flow.edit()} grow />
          <ActionButton
            label="Confirm swap"
            variant="primary"
            onPress={() => void flow.confirm()}
            grow
          />
        </View>
      </View>
    );
  }

  if (state.stage === 'authorizing' || state.stage === 'simulating') {
    return (
      <View style={styles.centered}>
        <ProcessingVoice width={64} height={64} />
        <Text style={styles.title}>
          {state.stage === 'authorizing'
            ? 'Waiting for your confirmation…'
            : 'Running the simulation…'}
        </Text>
        {notice}
      </View>
    );
  }

  if (state.stage === 'completed') {
    return (
      <View style={styles.centered}>
        <SuccessVoice width={64} height={64} />
        <Text style={styles.title}>Simulation complete</Text>
        <Text style={styles.body}>{describeQuote(state.quote)}</Text>
        <Text style={styles.notice}>No funds were exchanged. Your balances did not change.</Text>
        <ActionButton label="Done" variant="primary" onPress={() => onClearIntent?.()} />
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <AttentionVoice width={64} height={64} />
      <Text style={[styles.title, styles.errorTitle]}>The simulation failed</Text>
      <Text style={styles.caption}>{state.note}</Text>
      <View style={styles.actions}>
        <ActionButton label="Done" variant="outlined" onPress={() => onClearIntent?.()} grow />
        <ActionButton label="Start again" variant="primary" onPress={restart} grow />
      </View>
    </View>
  );
}

/** The typed amount shown in the other bitcoin unit (or in BTC at the
 * example rate when paying USDm), so sats and BTC are never confused. */
function BtcEquivalent({ draft, from, btcUnit }: { draft: string; from: SwapAsset; btcUnit: BtcUnit }) {
  const styles = useThemedStyles(makeStyles);
  const amount = parseSwapAmount(draft, from, btcUnit);
  if (amount === null || amount === 0) {
    return null;
  }
  let text: string;
  if (from === 'USDM') {
    text = `≈ ${formatSatsAsBtc(convertAtExampleRate(amount, 'USDM'))} at the example rate`;
  } else if (btcUnit === 'SATS') {
    text = `= ${formatSatsAsBtc(amount)}`;
  } else {
    text = `= ${formatSwapAmount(amount, 'BTC')}`;
  }
  return <Text style={styles.value}>{text}</Text>;
}

/** Spendable balance of the asset being swapped away, in the quote's unit; null when unknown. */
function availableBalance(
  wallet: ReturnType<typeof useWalletSession>['wallet'],
  asset: SwapAsset,
): number | null {
  if (wallet === null) {
    return null;
  }
  if (asset === 'BTC') {
    return wallet.btcSpendableSat;
  }
  return wallet.balanceUsdmBaseUnits === null
    ? null
    : usdmCentsFromBaseUnits(wallet.balanceUsdmBaseUnits);
}

function formatWithBtc(amount: number, asset: SwapAsset): string {
  const formatted = formatSwapAmount(amount, asset);
  return asset === 'BTC' ? `${formatted}\n(${formatSatsAsBtc(amount)})` : formatted;
}

function QuoteRows({ quote }: { quote: SwapQuote }) {
  const styles = useThemedStyles(makeStyles);
  const from = inputAsset(quote.direction);
  const rows = [
    { label: 'You pay', value: formatWithBtc(quote.amountIn, from) },
    { label: 'Fee (example)', value: formatWithBtc(quote.feeIn, from) },
    { label: 'You receive', value: formatWithBtc(quote.amountOut, outputAsset(quote.direction)) },
    {
      label: 'Rate (example)',
      value: `1 USDm = ${quote.satsPerUsdm.toLocaleString('en-US')} sats`,
    },
  ];
  return (
    <>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.caption}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </>
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
