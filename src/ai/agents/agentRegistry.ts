import type { AgentDefinition } from './agentDefinition';
import type { AgentParseMap } from './agentParseMap';
import { VoiceAgent } from './VoiceAgent';
import { paymentConfirmationAgent } from './paymentConfirmationAgent';
import { walletIntentAgent } from './walletIntentAgent';

/** Every agent definition this app ships, keyed by its enum member. The
 * mapped type makes the registry exhaustive over VoiceAgent at compile
 * time: adding an enum member without registering it fails the build. */
type AgentRegistry = {
  [V in VoiceAgent]: AgentDefinition<AgentParseMap[V]>;
};

const AGENT_REGISTRY: AgentRegistry = {
  [VoiceAgent.WalletIntent]: walletIntentAgent,
  [VoiceAgent.PaymentConfirmation]: paymentConfirmationAgent,
};

/**
 * The redirect the voice flow is built on: an agent enum in, the matching
 * system prompt + JSON answer format out. Inference code never branches on
 * which agent is running.
 */
export function getAgentDefinition<V extends VoiceAgent>(
  agent: V,
): AgentRegistry[V] {
  return AGENT_REGISTRY[agent];
}
