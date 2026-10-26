import {
  normalizeNumberWords,
  filterTranscript,
} from '../../src/voice/stt';
import {
  understandTranscript,
  parseWithRules,
} from '../../src/voice/intents';
import { WalletInstruction } from '../../src/ai/qwen';

/**
 * The tiered intent corpus (design phase 4 exit): pure text in, `Parsed`
 * out — no audio, no device, no QVAC. Runs in CI.
 */

const NO_LLM = {
  llmParse: async () => {
    throw new Error('tier 1 should not run for rule-matched transcripts');
  },
};

function llmWith(instruction: Partial<WalletInstruction>) {
  return {
    llmParse: async () => ({
      intent: 'SEND_PAYMENT' as const,
      amount: null,
      currency: null,
      recipient: null,
      timeframe: null,
      limit: null,
      purpose: null,
      target_layer: null,
      ...instruction,
    }),
  };
}

describe('transcript filtering (stt)', () => {
  it('drops silence hallucinations', () => {
    expect(filterTranscript('')).toBeNull();
    expect(filterTranscript('   ')).toBeNull();
    expect(filterTranscript('[BLANK_AUDIO]')).toBeNull();
    expect(filterTranscript('(silence)')).toBeNull();
    expect(filterTranscript('you')).toBeNull();
    expect(filterTranscript('Thank you.')).toBeNull();
  });

  it('drops clips with no real speech', () => {
    expect(filterTranscript('hm')).toBeNull();
    expect(filterTranscript('...')).toBeNull();
  });

  it('keeps real commands', () => {
    expect(filterTranscript('Send five dollars to Maria')).toBe(
      'Send five dollars to Maria',
    );
    expect(filterTranscript("What's my balance?")).toBe("What's my balance?");
  });
});

describe('spoken number words (stt)', () => {
  it('converts single digits', () => {
    expect(normalizeNumberWords('send five dollars to maria')).toBe(
      'send 5 dollars to maria',
    );
  });

  it('converts compound tens', () => {
    expect(normalizeNumberWords('send twenty five dollars')).toBe(
      'send 25 dollars',
    );
  });

  it('converts hundreds with and', () => {
    expect(normalizeNumberWords('send one hundred and twenty five usdm')).toBe(
      'send 125 usdm',
    );
  });

  it('converts thousands', () => {
    expect(normalizeNumberWords('send one thousand five hundred usdm')).toBe(
      'send 1500 usdm',
    );
  });

  it('converts decimals', () => {
    expect(normalizeNumberWords('send five point five usdm')).toBe(
      'send 5.5 usdm',
    );
    expect(normalizeNumberWords('send zero point two five usdm')).toBe(
      'send 0.25 usdm',
    );
  });

  it('leaves homophones outside numbers untouched', () => {
    expect(normalizeNumberWords('send five dollars to maria')).toBe(
      'send 5 dollars to maria',
    );
  });

  // "five oh five" (digit-string reading -> 505) is deliberately not
  // supported: payment commands never use digit-string numbers, and the
  // additive reading keeps the parser honest for real amounts.
});

describe('tier 0 rules (intents)', () => {
  it('parses a complete send command', () => {
    const instruction = parseWithRules('send 5 dollars to maria');
    expect(instruction).toEqual({
      intent: 'SEND_PAYMENT',
      amount: 5,
      currency: 'USDm',
      recipient: 'maria',
      timeframe: null,
      limit: null,
      purpose: null,
      target_layer: null,
    });
  });

  it('parses a sats send', () => {
    const instruction = parseWithRules('send 500 sats to kampala market');
    expect(instruction?.intent).toBe('SEND_PAYMENT');
    expect(instruction?.amount).toBe(500);
    expect(instruction?.currency).toBe('sats');
  });

  it('keeps a send without details parseable (the card asks for them)', () => {
    const instruction = parseWithRules('i want to send money');
    expect(instruction?.intent).toBe('SEND_PAYMENT');
    expect(instruction?.amount).toBeNull();
  });

  it('parses the read-only intents', () => {
    expect(parseWithRules("what's my balance")?.intent).toBe('CHECK_BALANCE');
    expect(parseWithRules('show my transaction history')?.intent).toBe(
      'GET_TRANSACTION_HISTORY',
    );
    expect(parseWithRules('how much did i spend')?.intent).toBe(
      'GET_SPENDING_SUMMARY',
    );
    expect(parseWithRules('i need a payment request')?.intent).toBe(
      'RECEIVE_PAYMENT',
    );
  });

  it('parses a payment request with the spoken amount', () => {
    const instruction = parseWithRules('i need a payment request of 30 dollars');
    expect(instruction?.intent).toBe('RECEIVE_PAYMENT');
    expect(instruction?.amount).toBe(30);
    expect(parseWithRules('receive 15 dollars')?.amount).toBe(15);
  });

  it('does not rule-match nonsense (tier 1 decides)', () => {
    expect(parseWithRules('hello what can you do')).toBeNull();
    expect(parseWithRules('flip a coin for me')).toBeNull();
  });
});

describe('tiered understanding (intents)', () => {
  it('prefers rules and never calls the LLM', async () => {
    const parsed = await understandTranscript("what's my balance", NO_LLM);
    expect(parsed).toEqual({
      kind: 'intent',
      source: 'rule',
      instruction: expect.objectContaining({ intent: 'CHECK_BALANCE' }),
    });
  });

  it('falls back to the LLM and validates its answer', async () => {
    const parsed = await understandTranscript(
      'please move some money for me',
      llmWith({ intent: 'SEND_PAYMENT', amount: 5, recipient: 'maria' }),
    );
    expect(parsed).toEqual({
      kind: 'intent',
      source: 'llm',
      instruction: expect.objectContaining({
        intent: 'SEND_PAYMENT',
        amount: 5,
      }),
    });
  });

  it('rejects an LLM answer with an unknown intent', async () => {
    const parsed = await understandTranscript(
      'tell me a joke',
      llmWith({ intent: 'UNKNOWN' }),
    );
    expect(parsed).toEqual({ kind: 'unclear' });
  });

  it('rejects an LLM answer that violates the schema', async () => {
    const parsed = await understandTranscript('do a thing', {
      llmParse: async () =>
        JSON.parse('{"intent": "SEND_PAYMENT", "amount": "five"}') as WalletInstruction,
    });
    expect(parsed).toEqual({ kind: 'unclear' });
  });

  it('survives an LLM timeout as unclear', async () => {
    const parsed = await understandTranscript('do a thing', {
      llmParse: async () => {
        throw new Error('Request timed out');
      },
    });
    expect(parsed).toEqual({ kind: 'unclear' });
  });
});
