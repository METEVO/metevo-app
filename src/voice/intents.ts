import { z } from 'zod';

import type { WalletInstruction } from '../ai/qwen';

/**
 * Tiered intent understanding (design phase 4). Tier 0 is deterministic
 * rule matching for the traffic the demo actually sees; tier 1 is the Qwen
 * parser. Everything is validated before it leaves this module — the LLM
 * only picks an intent, it never decides what happens.
 */

export type IntentName = WalletInstruction['intent'];

export type Parsed =
  | { kind: 'intent'; instruction: WalletInstruction; source: 'rule' | 'llm' }
  | { kind: 'unclear' };

export interface IntentPorts {
  /** Tier 1: the Qwen parser (throws on timeout or non-JSON replies). */
  llmParse: (transcript: string) => Promise<WalletInstruction>;
}

/** The exact structure a parsed instruction must have after validation. */
const instructionSchema = z.object({
  intent: z.enum([
    'SEND_PAYMENT',
    'CHECK_BALANCE',
    'RECEIVE_PAYMENT',
    'GET_SPENDING_SUMMARY',
    'GET_TRANSACTION_HISTORY',
    'SWAP',
    'UNKNOWN',
  ]),
  amount: z.number().finite().nullable(),
  currency: z.string().nullable(),
  recipient: z.string().nullable(),
  timeframe: z.string().nullable(),
  limit: z.number().int().nullable(),
  purpose: z.string().nullable(),
  target_layer: z.enum(['RGB_LN', 'BTC_LN', 'ONCHAIN']).nullable(),
});

function emptyInstruction(intent: IntentName): WalletInstruction {
  return {
    intent,
    amount: null,
    currency: null,
    recipient: null,
    timeframe: null,
    limit: null,
    purpose: null,
    target_layer: null,
  };
}

const USD_AMOUNT = /(?:\$|usdm\s*)?(\d+(?:\.\d+)?)\s*(?:usdm|dollars?|bucks)?\b/i;
const SAT_AMOUNT = /(\d+(?:\.\d+)?)\s*(?:sats?|satoshis?|btc|bitcoin)\b/i;
const RECIPIENT = /\bto\s+([a-z][a-z .'-]{1,40}?)(?:\s+(?:and|then|please)|\s*$)/i;

function firstMatch(transcript: string, pattern: RegExp): number | null {
  const match = transcript.match(pattern);
  if (match === null) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function readRecipient(transcript: string): string | null {
  const match = transcript.match(RECIPIENT);
  if (match === null) {
    return null;
  }
  const recipient = match[1].trim().replace(/\s+/g, ' ');
  return recipient.length > 0 ? recipient : null;
}

/**
 * Tier 0: deterministic rules for the top commands. Rules never guess:
 * a send without a spoken amount or recipient still parses (the payment
 * card asks for the missing pieces), but the intent name must be certain.
 */
export function parseWithRules(transcript: string): WalletInstruction | null {
  const text = transcript.toLowerCase();

  if (/\b(balance|balances|how much (do i have|money)|my funds)\b/.test(text)) {
    return emptyInstruction('CHECK_BALANCE');
  }
  if (/\b(transaction history|transactions|last payments|my history)\b/.test(text)) {
    return emptyInstruction('GET_TRANSACTION_HISTORY');
  }
  if (/\b(spending|how much did i spend|spending summary)\b/.test(text)) {
    return emptyInstruction('GET_SPENDING_SUMMARY');
  }
  if (
    /\b(receive|receive money|request (money|funds|payment)|payment request|my invoice)\b/.test(text)
  ) {
    return {
      ...emptyInstruction('RECEIVE_PAYMENT'),
      // "I need a payment request of 30 dollars" -> amount 30; absent when
      // the command named no amount (the card then uses its default).
      amount: firstMatch(text, USD_AMOUNT),
    };
  }
  if (/\b(send|transfer|pay|give)\b/.test(text)) {
    const satAmount = firstMatch(text, SAT_AMOUNT);
    const usdAmount = firstMatch(text, USD_AMOUNT);
    const amount = satAmount ?? usdAmount;
    const currency = satAmount !== null ? 'sats' : usdAmount !== null ? 'USDm' : null;
    return {
      ...emptyInstruction('SEND_PAYMENT'),
      amount,
      currency,
      recipient: readRecipient(transcript),
    };
  }
  return null;
}

/**
 * Runs the tiers in order. Tier 1 failures degrade to `unclear` — the
 * orchestrator replies with the clarification and offers the typed path.
 */
export async function understandTranscript(
  transcript: string,
  ports: IntentPorts,
): Promise<Parsed> {
  const ruled = parseWithRules(transcript);
  if (ruled !== null) {
    return { kind: 'intent', instruction: ruled, source: 'rule' };
  }

  try {
    const instruction = await ports.llmParse(transcript);
    const validated = instructionSchema.safeParse(instruction);
    if (!validated.success || validated.data.intent === 'UNKNOWN') {
      return { kind: 'unclear' };
    }
    return { kind: 'intent', instruction: validated.data, source: 'llm' };
  } catch (cause) {
    console.warn('[metevo] intent tier 1 failed:', cause instanceof Error ? cause.message : cause);
    return { kind: 'unclear' };
  }
}
