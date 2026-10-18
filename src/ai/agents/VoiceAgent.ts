/**
 * The on-device voice agents METEVO runs through the QVAC completion model.
 *
 * Each agent owns its system prompt and JSON answer format; the registry in
 * `agentRegistry.ts` redirects a run to the right pair. Adding an agent
 * means: add an enum member, add its prompt + schema module, register it.
 */
export enum VoiceAgent {
  /** Voice command -> structured wallet intent (the core parser). */
  WalletIntent = 'WalletIntent',
  /** Spoken reply to an on-screen payment review -> cancel / continue. */
  PaymentConfirmation = 'PaymentConfirmation',
}
