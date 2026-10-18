import type { UiLanguage } from '../hooks/useWalletSession';
import type { IntentId } from '../types/intents';
import type { WalletIntentParse } from './agents/walletIntentAgent';
import { spokenMessage, SpokenMessageId } from './localization/spokenMessages';
import {
  IntentValidationError,
  validateWalletIntent,
} from './validation/intentValidator';
import { checkTransactionReadiness } from './validation/transactionReadiness';
import { adaptWalletResult, intentToCardId, WalletCommandResult } from './walletResult';

/**
 * The voice pipeline core: recording uri -> transcript -> WalletIntent
 * agent -> deterministic validation -> wallet JSON -> card id + spoken
 * message.
 *
 * Ported from the reference pipeline (`main.process_instruction` inside the
 * language boundary of `pipeline.process_multilingual`). Engines are
 * injected, so the decision logic is unit-testable without the QVAC
 * runtime; `voicePipeline.ts` holds the real-device wiring. Every failure
 * becomes a structured outcome with a spoken fallback - the pipeline never
 * throws, so the UI always keeps a safe manual path.
 */

export type VoiceOutcomeStatus =
  | 'ready'
  | 'awaiting-confirmation'
  | 'missing-details'
  | 'not-understood'
  | 'unsupported'
  | 'error';

export interface VoiceOutcome {
  status: VoiceOutcomeStatus;
  /** DynamicFrame card to open, null when nothing should render. */
  cardId: IntentId | null;
  /** Localized prose for the speaker (never parsed by code). */
  spokenMessage: string;
  /** English canonical sentence for the audit log. */
  canonicalMessage: string;
  /** The validated wallet JSON, when a command was understood. */
  walletResult: WalletCommandResult | null;
  transcript: string;
  errorCode: string | null;
}

/** Everything the pipeline needs from the on-device engines. */
export interface VoicePipelineEngines {
  transcribe(recordingUri: string, language: UiLanguage): Promise<string>;
  runWalletIntent(transcript: string): Promise<WalletIntentParse>;
}

/** Message id driving the spoken outcome for a successful parse. */
const SUCCESS_MESSAGES: Record<string, SpokenMessageId> = {
  CHECK_BALANCE: 'balanceReady',
  RECEIVE_PAYMENT: 'receiveRequestParsed',
  GET_SPENDING_SUMMARY: 'spendingReady',
  GET_TRANSACTION_HISTORY: 'historyReady',
  SWAP: 'swapNotSupported',
};

export async function processVoiceCommand(
  engines: VoicePipelineEngines,
  recordingUri: string,
  language: UiLanguage,
): Promise<VoiceOutcome> {
  const transcript = await safeTranscribe(engines, recordingUri, language);
  if (transcript.trim().length === 0) {
    return outcome({
      status: 'error',
      spokenMessage: spokenMessage('emptyTranscription', language),
      canonicalMessage: 'EMPTY_TRANSCRIPTION',
      transcript,
      errorCode: 'EMPTY_TRANSCRIPTION',
    });
  }

  try {
    const parsed = await engines.runWalletIntent(transcript);
    if (parsed.intent === 'UNKNOWN') {
      return outcome({
        status: 'not-understood',
        spokenMessage: spokenMessage('didNotUnderstand', language),
        canonicalMessage: 'UNKNOWN_INTENT',
        transcript,
      });
    }

    const validated = validateWalletIntent(parsed, transcript);
    const walletResult = adaptWalletResult(validated);

    if (validated.intent !== 'SEND_PAYMENT') {
      const messageId = SUCCESS_MESSAGES[validated.intent] ?? 'reviewDetails';
      return outcome({
        status: 'ready',
        spokenMessage: spokenMessage(messageId, language),
        canonicalMessage: validated.intent,
        transcript,
        cardId: intentToCardId(walletResult),
        walletResult,
      });
    }

    const readiness = checkTransactionReadiness(validated);
    if (!readiness.ready) {
      return outcome({
        status: 'missing-details',
        spokenMessage: spokenMessage('missingTransferDetails', language),
        canonicalMessage: 'MISSING_PARAMETERS',
        transcript,
        walletResult,
      });
    }

    // Never executes anything: the review card and its touch confirm stay
    // the only path that submits a payment (design rule: spoken never
    // selects, propose + one-tap approve).
    return outcome({
      status: 'awaiting-confirmation',
      spokenMessage: spokenMessage('reviewAndConfirm', language),
      canonicalMessage: readiness.message ?? '',
      transcript,
      cardId: intentToCardId(walletResult),
      walletResult,
    });
  } catch (error) {
    const errorCode = error instanceof IntentValidationError ? error.code : 'PARSING_ERROR';
    return outcome({
      status: 'error',
      spokenMessage: spokenMessage('didNotUnderstand', language),
      canonicalMessage: errorCode,
      transcript,
      errorCode,
    });
  }
}

/** Single constructor for the outcome shape: absent fields become null. */
function outcome(init: {
  status: VoiceOutcomeStatus;
  spokenMessage: string;
  canonicalMessage: string;
  transcript: string;
  cardId?: IntentId | null;
  walletResult?: WalletCommandResult | null;
  errorCode?: string | null;
}): VoiceOutcome {
  return {
    status: init.status,
    cardId: init.cardId ?? null,
    spokenMessage: init.spokenMessage,
    canonicalMessage: init.canonicalMessage,
    walletResult: init.walletResult ?? null,
    transcript: init.transcript,
    errorCode: init.errorCode ?? null,
  };
}

/** A transcription failure degrades to "no speech", not to a crash. */
async function safeTranscribe(
  engines: VoicePipelineEngines,
  recordingUri: string,
  language: UiLanguage,
): Promise<string> {
  try {
    return await engines.transcribe(recordingUri, language);
  } catch {
    return '';
  }
}
