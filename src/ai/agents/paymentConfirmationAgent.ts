import { AgentDefinition, AgentParseError } from './agentDefinition';
import { VoiceAgent } from './VoiceAgent';
import { PAYMENT_CONFIRMATION_SYSTEM_PROMPT } from './prompts/paymentConfirmationPrompt';

/**
 * What the user's spoken reply to an on-screen payment review means.
 * CONTINUE never executes anything: the touch confirm on the review card
 * remains the only path that submits a payment.
 */
export type PaymentConfirmationDecision = 'CANCEL' | 'CONTINUE' | 'UNCLEAR';

/** The confirmation agent's raw answer. */
export interface PaymentConfirmationParse {
  decision: PaymentConfirmationDecision;
  matchedPhrase: string | null;
}

const PAYMENT_CONFIRMATION_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    decision: {
      type: 'string',
      enum: ['CANCEL', 'CONTINUE', 'UNCLEAR'],
    },
    matchedPhrase: { type: ['string', 'null'] },
  },
  required: ['decision', 'matchedPhrase'],
  additionalProperties: false,
};

function assertConfirmationShape(candidate: unknown): PaymentConfirmationParse {
  if (typeof candidate !== 'object' || candidate === null) {
    throw new AgentParseError(VoiceAgent.PaymentConfirmation, 'answer is not an object');
  }
  const value = candidate as Record<string, unknown>;
  if (typeof value.decision !== 'string') {
    throw new AgentParseError(VoiceAgent.PaymentConfirmation, 'missing decision');
  }
  return {
    decision: value.decision as PaymentConfirmationParse['decision'],
    matchedPhrase: typeof value.matchedPhrase === 'string' ? value.matchedPhrase : null,
  };
}

export const paymentConfirmationAgent: AgentDefinition<PaymentConfirmationParse> = {
  id: VoiceAgent.PaymentConfirmation,
  systemPrompt: PAYMENT_CONFIRMATION_SYSTEM_PROMPT,
  responseSchema: PAYMENT_CONFIRMATION_RESPONSE_SCHEMA,
  parseResponse(rawContent) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent.trim());
    } catch {
      throw new AgentParseError(VoiceAgent.PaymentConfirmation, 'answer is not valid JSON');
    }
    return assertConfirmationShape(parsed);
  },
};
