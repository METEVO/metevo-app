import { ENV } from '../../config/env';
import { PaymentVoiceIntent, parseVoicePaymentIntent } from './paymentIntent';

/**
 * QVAC voice-to-intent seam.
 *
 * The seven UI languages each resolve to a configured QVAC model
 * identifier (see .env.example); unset languages fall back to the shared
 * intent model. The actual model load/completion call lands with the QVAC
 * SDK integration (it runs in the Bare worklet like the wallet node);
 * until then this module owns the resolution, the logging seam and the
 * strict parse of the model's JSON answer, so the voice phase only has to
 * swap the transcription call in.
 */
import type { UiLanguage } from '../../hooks/useWalletSession';

const MODEL_BY_LANGUAGE: Record<UiLanguage, string | null> = {
  english: ENV.EXPO_PUBLIC_QVAC_MODEL_ENGLISH ?? null,
  italiano: ENV.EXPO_PUBLIC_QVAC_MODEL_ITALIANO ?? null,
  turkce: ENV.EXPO_PUBLIC_QVAC_MODEL_TURKCE ?? null,
  francais: ENV.EXPO_PUBLIC_QVAC_MODEL_FRANCAIS ?? null,
  hindi: ENV.EXPO_PUBLIC_QVAC_MODEL_HINDI ?? null,
  espanol: ENV.EXPO_PUBLIC_QVAC_MODEL_ESPANOL ?? null,
  kiswahili: ENV.EXPO_PUBLIC_QVAC_MODEL_KISWAHILI ?? null,
};

/** Resolves the QVAC model for the session language (never null). */
export function resolveQvacModelForLanguage(language: UiLanguage | null): string {
  if (language !== null) {
    const configured = MODEL_BY_LANGUAGE[language];
    if (configured !== null) {
      return configured;
    }
  }
  return ENV.EXPO_PUBLIC_QVAC_INTENT_MODEL;
}

/**
 * Parses the configured model's JSON answer into a payment intent. The
 * model output is untrusted: an invalid answer logs the seam and returns
 * null so the flow falls back to the manual path (never a guessed
 * payment).
 */
export function recognizePaymentIntent(
  modelOutput: unknown,
  language: UiLanguage | null,
): PaymentVoiceIntent | null {
  const model = resolveQvacModelForLanguage(language);
  const intent = parseVoicePaymentIntent(modelOutput);
  console.log(
    `[metevo] voice seam recognizePaymentIntent(model=${model}): ${intent === null ? 'no payment intent' : `pay ${intent.amount} ${intent.asset} to ${intent.recipient}`}`,
  );
  return intent;
}
