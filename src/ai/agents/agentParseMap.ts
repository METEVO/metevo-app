import { VoiceAgent } from './VoiceAgent';
import type { PaymentConfirmationParse } from './paymentConfirmationAgent';
import type { WalletIntentParse } from './walletIntentAgent';

/**
 * The parsed answer shape each agent produces. Kept beside the agents so
 * the registry, the runner and the pipeline agree on it without cycles.
 */
export interface AgentParseMap {
  [VoiceAgent.WalletIntent]: WalletIntentParse;
  [VoiceAgent.PaymentConfirmation]: PaymentConfirmationParse;
}
