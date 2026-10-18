import { getAgentDefinition } from '../../src/ai/agents/agentRegistry';
import { VoiceAgent } from '../../src/ai/agents/VoiceAgent';

describe('agentRegistry', () => {
  test('every agent enum member is registered with prompt and schema', () => {
    for (const agent of Object.values(VoiceAgent)) {
      const definition = getAgentDefinition(agent);
      expect(definition.id).toBe(agent);
      expect(definition.systemPrompt.trim().length).toBeGreaterThan(0);
      expect(definition.responseSchema.type).toBe('object');
      expect(Object.keys(definition.responseSchema.properties ?? {}).length).toBeGreaterThan(0);
    }
  });

  test('the wallet agent redirects to the wallet schema and prompt', () => {
    const definition = getAgentDefinition(VoiceAgent.WalletIntent);
    expect(definition.systemPrompt).toContain('financial intent parser');
    expect(definition.responseSchema.required).toContain('target_layer');
  });

  test('the confirmation agent redirects to its own prompt and schema', () => {
    const definition = getAgentDefinition(VoiceAgent.PaymentConfirmation);
    expect(definition.systemPrompt).toContain('payment confirmation listener');
    expect(definition.responseSchema.required).toEqual(['decision', 'matchedPhrase']);
  });

  test('the wallet agent parses a valid answer into its shape', () => {
    const definition = getAgentDefinition(VoiceAgent.WalletIntent);
    const parsed = definition.parseResponse(
      '{"intent":"CHECK_BALANCE","amount":null,"currency":null,"recipient":null,' +
        '"timeframe":null,"limit":null,"purpose":null,"target_layer":null}',
    );
    expect(parsed.intent).toBe('CHECK_BALANCE');
  });

  test('the wallet agent rejects malformed answers instead of guessing', () => {
    const definition = getAgentDefinition(VoiceAgent.WalletIntent);
    expect(() => definition.parseResponse('not json at all')).toThrow();
    expect(() => definition.parseResponse('{"intent":"CHECK_BALANCE"}')).toThrow();
  });

  test('the confirmation agent parses a decision', () => {
    const definition = getAgentDefinition(VoiceAgent.PaymentConfirmation);
    const parsed = definition.parseResponse('{"decision":"CANCEL","matchedPhrase":"no"}');
    expect(parsed.decision).toBe('CANCEL');
  });
});
