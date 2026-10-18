import { VoicePipelineEngines, processVoiceCommand } from '../../src/ai/voicePipelineCore';
import { WalletIntentParse } from '../../src/ai/agents/walletIntentAgent';
import type { UiLanguage } from '../../src/hooks/useWalletSession';

const LANGUAGE: UiLanguage = 'english';

function parseWith(overrides: Partial<WalletIntentParse>): WalletIntentParse {
  return {
    intent: 'CHECK_BALANCE',
    amount: null,
    currency: null,
    recipient: null,
    timeframe: null,
    limit: null,
    purpose: null,
    target_layer: null,
    ...overrides,
  };
}

function enginesWith(
  parsed: WalletIntentParse | Error,
  transcript = 'test command',
): VoicePipelineEngines {
  return {
    transcribe: async () => transcript,
    runWalletIntent: async () => {
      if (parsed instanceof Error) {
        throw parsed;
      }
      return parsed;
    },
  };
}

describe('processVoiceCommand', () => {
  test('an empty transcription fails safely without reaching the agent', () => {
    const engines: VoicePipelineEngines = {
      transcribe: async () => '   ',
      runWalletIntent: async () => {
        throw new Error('must not run');
      },
    };
    const outcome = processVoiceCommand(engines, 'file.m4a', LANGUAGE);
    return expect(outcome).resolves.toMatchObject({
      status: 'error',
      errorCode: 'EMPTY_TRANSCRIPTION',
      cardId: null,
    });
  });

  test('an unknown intent is spoken, not rendered', async () => {
    const outcome = await processVoiceCommand(
      enginesWith(parseWith({ intent: 'UNKNOWN' })),
      'file.m4a',
      LANGUAGE,
    );
    expect(outcome.status).toBe('not-understood');
    expect(outcome.cardId).toBeNull();
    expect(outcome.spokenMessage).toContain('couldn’t understand');
  });

  test('a balance request opens the balance card with its spoken message', async () => {
    const outcome = await processVoiceCommand(
      enginesWith(parseWith({ intent: 'CHECK_BALANCE' })),
      'file.m4a',
      LANGUAGE,
    );
    expect(outcome.status).toBe('ready');
    expect(outcome.cardId).toBe('read-balance');
    expect(outcome.spokenMessage).toBe('Your balance request is ready.');
    expect(outcome.walletResult?.intent).toBe('CHECK_BALANCE');
  });

  test('a complete send parks in awaiting-confirmation and never executes', async () => {
    const outcome = await processVoiceCommand(
      enginesWith(
        parseWith({
          intent: 'SEND_PAYMENT',
          amount: 15,
          currency: 'USDM',
          recipient: 'Sevgi',
        }),
        'Send 15 dollars to Sevgi',
      ),
      'file.m4a',
      LANGUAGE,
    );
    expect(outcome.status).toBe('awaiting-confirmation');
    expect(outcome.cardId).toBe('send-usdm');
    expect(outcome.canonicalMessage).toBe(
      'Please confirm sending 15 USDM to Sevgi.',
    );
  });

  test('an incomplete send asks for the missing details', async () => {
    const outcome = await processVoiceCommand(
      enginesWith(
        parseWith({
          intent: 'SEND_PAYMENT',
          amount: 15,
          recipient: 'Sevgi',
        }),
        'Send 15 to Sevgi',
      ),
      'file.m4a',
      LANGUAGE,
    );
    expect(outcome.status).toBe('missing-details');
    expect(outcome.cardId).toBeNull();
  });

  test('a validation failure becomes a structured error outcome', async () => {
    const outcome = await processVoiceCommand(
      enginesWith(
        parseWith({ intent: 'RECEIVE_PAYMENT' }),
        'send 10 to Bob',
      ),
      'file.m4a',
      LANGUAGE,
    );
    expect(outcome.status).toBe('error');
    expect(outcome.errorCode).toBe('direction-conflict');
    expect(outcome.cardId).toBeNull();
  });

  test('an agent failure becomes a structured error outcome', async () => {
    const outcome = await processVoiceCommand(
      enginesWith(new Error('model exploded')),
      'file.m4a',
      LANGUAGE,
    );
    expect(outcome.status).toBe('error');
    expect(outcome.errorCode).toBe('PARSING_ERROR');
  });

  test('an unsupported currency never reaches the wallet', async () => {
    const outcome = await processVoiceCommand(
      enginesWith(
        parseWith({ intent: 'SEND_PAYMENT', amount: 50, currency: 'USDT' }),
        'Send 50 USDT to Maria',
      ),
      'file.m4a',
      LANGUAGE,
    );
    expect(outcome.status).toBe('error');
    expect(outcome.errorCode).toBe('unsupported-currency');
    expect(outcome.walletResult).toBeNull();
  });

  test('a transcription failure degrades to the empty-transcription path', async () => {
    const engines: VoicePipelineEngines = {
      transcribe: async () => {
        throw new Error('mic gone');
      },
      runWalletIntent: async () => {
        throw new Error('must not run');
      },
    };
    const outcome = await processVoiceCommand(engines, 'file.m4a', LANGUAGE);
    expect(outcome.errorCode).toBe('EMPTY_TRANSCRIPTION');
  });
});
