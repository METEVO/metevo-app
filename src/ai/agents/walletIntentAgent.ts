import { AgentDefinition, AgentParseError } from './agentDefinition';
import { VoiceAgent } from './VoiceAgent';
import { WALLET_INTENT_SYSTEM_PROMPT } from './prompts/walletIntentPrompt';

/** Intents the WalletIntent agent can answer with (mirrors the reference). */
export type WalletIntentName =
  | 'SEND_PAYMENT'
  | 'CHECK_BALANCE'
  | 'RECEIVE_PAYMENT'
  | 'SWAP'
  | 'GET_SPENDING_SUMMARY'
  | 'GET_TRANSACTION_HISTORY'
  | 'UNKNOWN';

/** Payment layers the wallet supports; null when the user named none. */
export type WalletTargetLayer = 'RGB_LN' | 'BTC_LN' | 'ONCHAIN' | null;

/** The parser's raw answer, exactly as the reference JSON schema defines it. */
export interface WalletIntentParse {
  intent: WalletIntentName;
  amount: number | null;
  currency: string | null;
  recipient: string | null;
  timeframe: string | null;
  limit: number | null;
  purpose: string | null;
  target_layer: WalletTargetLayer;
}

/**
 * JSON schema sent with the completion request. Field names inside the
 * payload stay snake_case to match the wallet JSON contract the reference
 * pipeline (`response_adapter.py`) hands over.
 */
const WALLET_INTENT_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'SEND_PAYMENT',
        'CHECK_BALANCE',
        'RECEIVE_PAYMENT',
        'SWAP',
        'GET_SPENDING_SUMMARY',
        'GET_TRANSACTION_HISTORY',
        'UNKNOWN',
      ],
    },
    amount: { type: ['number', 'null'] },
    currency: { type: ['string', 'null'] },
    recipient: { type: ['string', 'null'] },
    timeframe: { type: ['string', 'null'] },
    limit: { type: ['integer', 'null'] },
    purpose: { type: ['string', 'null'] },
    target_layer: {
      type: ['string', 'null'],
      enum: ['RGB_LN', 'BTC_LN', 'ONCHAIN', null],
    },
  },
  required: [
    'intent',
    'amount',
    'currency',
    'recipient',
    'timeframe',
    'limit',
    'purpose',
    'target_layer',
  ],
  additionalProperties: false,
};

/** Structural check before anything downstream trusts the parsed object. */
function assertWalletIntentShape(candidate: unknown): WalletIntentParse {
  if (typeof candidate !== 'object' || candidate === null) {
    throw new AgentParseError(VoiceAgent.WalletIntent, 'answer is not an object');
  }
  const value = candidate as Record<string, unknown>;
  for (const key of [
    'intent',
    'amount',
    'currency',
    'recipient',
    'timeframe',
    'limit',
    'purpose',
    'target_layer',
  ]) {
    if (!(key in value)) {
      throw new AgentParseError(VoiceAgent.WalletIntent, `missing field ${key}`);
    }
  }
  return value as unknown as WalletIntentParse;
}

export const walletIntentAgent: AgentDefinition<WalletIntentParse> = {
  id: VoiceAgent.WalletIntent,
  systemPrompt: WALLET_INTENT_SYSTEM_PROMPT,
  responseSchema: WALLET_INTENT_RESPONSE_SCHEMA,
  parseResponse(rawContent) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent.trim());
    } catch {
      throw new AgentParseError(VoiceAgent.WalletIntent, 'answer is not valid JSON');
    }
    return assertWalletIntentShape(parsed);
  },
};
