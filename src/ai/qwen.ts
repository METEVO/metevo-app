import { completion, loadModel, QWEN3_600M_INST_Q4 } from '@qvac/sdk';

import { ModelDownloadProgress } from './whisper';

/**
 * QVAC Qwen intent parser: turns the transcript into the strict wallet
 * JSON the home agent maps onto intent cards. The schema and rules come
 * from the METEVO reference parser; `/no_think` keeps the small model
 * answer-only.
 */

const walletSchema = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'SEND_PAYMENT',
        'CHECK_BALANCE',
        'RECEIVE_PAYMENT',
        'GET_SPENDING_SUMMARY',
        'GET_TRANSACTION_HISTORY',
        'SWAP',
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

const systemPrompt = `
You are METEVO, a cryptocurrency wallet intent parser.
Extract the user's intent and parameters.
Return only valid JSON.
Never invent amounts, recipients, purposes, or payment layers.
Use null for missing values.
Distinguish sending funds from requesting funds.
Do not confuse swapping with sending.
If the request does not match any intent, return UNKNOWN.
/no_think
`.trim();

let modelId: string | null = null;

/** QWEN3_600M_INST_Q4 is a QVAC registry descriptor: the SDK downloads and
 * checksum-verifies the weights on first use, then caches them on device. */
export async function initializeQwen(
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<void> {
  if (modelId !== null) {
    return;
  }

  modelId = await loadModel({
    modelSrc: QWEN3_600M_INST_Q4,
    onProgress,
  });
}

export interface WalletInstruction {
  intent:
    | 'SEND_PAYMENT'
    | 'CHECK_BALANCE'
    | 'RECEIVE_PAYMENT'
    | 'GET_SPENDING_SUMMARY'
    | 'GET_TRANSACTION_HISTORY'
    | 'SWAP'
    | 'UNKNOWN';
  amount: number | null;
  currency: string | null;
  recipient: string | null;
  timeframe: string | null;
  limit: number | null;
  purpose: string | null;
  target_layer: 'RGB_LN' | 'BTC_LN' | 'ONCHAIN' | null;
}

export async function parseWalletInstruction(userText: string): Promise<WalletInstruction> {
  await initializeQwen();

  if (modelId === null) {
    throw new Error('Qwen model is not loaded');
  }

  const run = completion({
    modelId,
    history: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ],
    stream: false,
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: 'wallet_instruction',
        schema: walletSchema,
      },
    },
  });

  const result = await run.final;
  return JSON.parse(result.contentText.trim()) as WalletInstruction;
}
