/**
 * Contract every voice agent fulfils. The runner (`agentRunner.ts`) reads an
 * agent from the registry by enum and uses exactly these three fields, so a
 * new agent never touches the inference code.
 */
export interface AgentDefinition<TParsed> {
  id: import('./VoiceAgent').VoiceAgent;
  /** Injected before the user's text on every completion. */
  systemPrompt: string;
  /** JSON schema the model must answer with (QVAC response_format). */
  responseSchema: Record<string, unknown>;
  /** Turns the raw completion text into the agent's parsed shape. */
  parseResponse(rawContent: string): TParsed;
}

/** Thrown when the model answer cannot be used as-is (fail-safe path). */
export class AgentParseError extends Error {
  constructor(agentId: string, reason: string) {
    super(`agent ${agentId} returned an unusable answer: ${reason}`);
    this.name = 'AgentParseError';
  }
}
