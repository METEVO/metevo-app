import type { AgentDefinition } from './agents/agentDefinition';
import type { AgentParseMap } from './agents/agentParseMap';
import { getAgentDefinition } from './agents/agentRegistry';
import { VoiceAgent } from './agents/VoiceAgent';
import { completeJson } from './engine/llmEngine';

/**
 * The single inference seam: an agent enum in, its system prompt and JSON
 * schema out of the registry, one schema-constrained completion, one parse.
 * Callers never see the SDK and never branch on the agent themselves.
 *
 * The cast is sound because the registry is an exhaustive Record over
 * VoiceAgent (checked at compile time in agentRegistry.ts), so the
 * definition found for `agent` is exactly the one AgentParseMap describes.
 */
export async function runAgent<V extends VoiceAgent>(
  agent: V,
  userText: string,
): Promise<AgentParseMap[V]> {
  const definition = getAgentDefinition(agent) as AgentDefinition<AgentParseMap[V]>;
  const rawContent = await completeJson({
    systemPrompt: definition.systemPrompt,
    userText,
    responseSchema: definition.responseSchema,
    schemaName: definition.id,
  });
  return definition.parseResponse(rawContent);
}
