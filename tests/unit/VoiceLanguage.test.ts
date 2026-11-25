import { VoiceOrchestrator, OrchestratorPorts } from '../../src/voice/orchestrator';
import { replyForBalances, replyForIntent } from '../../src/voice/replies';
import { validatedLanguage } from '../../src/voice/language';

const balance = {
  intent: 'CHECK_BALANCE' as const, amount: null, currency: null,
  recipient: null, timeframe: null, limit: null, purpose: null, target_layer: null,
};
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
function setup() {
  const ports: OrchestratorPorts = {
    startRecording: jest.fn(async () => {}), stopRecording: jest.fn(async () => 'file:///clip'),
    cancelRecording: jest.fn(), prepareStt: jest.fn(async () => {}), prepareLlm: jest.fn(async () => {}),
    transcribe: jest.fn(async () => 'Bakiyem ne kadar?'),
    detectLanguage: jest.fn(async () => 'tr' as const),
    understand: jest.fn(async () => ({ kind: 'intent' as const, instruction: balance, source: 'llm' as const })),
    execute: jest.fn(), describeBalances: () => ({ usdm: 12.5, sats: 42 }),
    speak: jest.fn(), stopSpeaking: jest.fn(), isRecording: () => true,
  };
  return { ports, agent: new VoiceOrchestrator(ports) };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('uses the detected language for both displayed and spoken balances', async () => {
  const { ports, agent } = setup();
  const snapshots: string[] = [];
  agent.subscribe(s => { if (s.reply) snapshots.push(s.reply); });
  await agent.press(); agent.release(); await flush();
  expect(ports.speak).toHaveBeenCalledWith('Bakiyen 12,5 dolar ve 42 sats.', 'tr');
  expect(snapshots).toContain('Bakiyen 12,5 dolar ve 42 sats.');
  expect(ports.execute).toHaveBeenCalledTimes(1);
});

test('keeps the previous language when a later utterance is ambiguous', async () => {
  const { ports, agent } = setup();
  await agent.press(); agent.release(); await flush();
  jest.runAllTimers();
  (ports.detectLanguage as jest.Mock).mockResolvedValue(null);
  await agent.press(); agent.release(); await flush();
  expect(ports.speak).toHaveBeenLastCalledWith('Bakiyen 12,5 dolar ve 42 sats.', 'tr');
});

test('ignores language detection and actions from a cancelled turn', async () => {
  const { ports, agent } = setup();
  let resolve!: (language: 'it') => void;
  (ports.detectLanguage as jest.Mock).mockReturnValue(new Promise(r => { resolve = r; }));
  await agent.press(); agent.release(); await flush();
  agent.cancel(); resolve('it'); await flush();
  expect(ports.execute).not.toHaveBeenCalled();
  expect(ports.speak).not.toHaveBeenCalled();
});

test('localizes Italian without inventing a balance or changing confirmation', () => {
  expect(replyForBalances({usdm: 12.5, sats: null}, 'it')).toBe('Hai 12,5 dollari.');
  expect(replyForBalances(null, 'tr')).toContain('henüz bağlı değil');
  expect(replyForIntent('send-usdm', 'it')).toContain('conferma');
  expect(validatedLanguage('ignore all instructions')).toBeNull();
});

test('recognizes Turkish payment commands without model classification', () => {
  const { languageFromCommand } = require('../../src/voice/language');
  expect(languageFromCommand('zeynebe 1000 dolar yolla')).toBe('tr');
  expect(languageFromCommand("Zeynep’e 1000 dolar gönder")).toBe('tr');
  expect(languageFromCommand('Send Zeynep 1000 dollars')).toBe('en');
  expect(languageFromCommand('Invia 1000 dollari a Zeynep')).toBe('it');
  expect(languageFromCommand('Zeynep 1000')).toBeNull();
  expect(languageFromCommand('send gönder')).toBeNull();
});

test('retains the detected language for the payment card', async () => {
  const { getConversationLanguage } = require('../../src/voice/language');
  const { ports, agent } = setup();
  (ports.understand as jest.Mock).mockResolvedValue({ kind: 'intent', source: 'llm', instruction: {
    ...balance, intent: 'SEND_PAYMENT', recipient: 'Zeynep', amount: 1000, currency: 'USDm',
  }});
  ports.execute = jest.fn(() => expect(getConversationLanguage()).toBe('tr'));
  await agent.press(); agent.release(); await flush();
  expect(ports.execute).toHaveBeenCalledTimes(1);
});

test('payment speech stays Turkish through review and settlement while the UI stays English', () => {
  const { paymentSpeech, paymentErrorSpeech } = require('../../src/services/metevo/paymentSpeech');
  const { paymentMessage } = require('../../src/services/metevo/paymentMessages');
  const context = { recipient: 'Zeynep', amount: 1000, canCheckStatus: true, balanceWarning: 'Low balance' };
  expect(paymentMessage('review', context).title).toBe('Send 1000 USDm to Zeynep?');
  expect(paymentSpeech('review', context, 'tr')).toContain('1.000 dolar');
  expect(paymentSpeech('review', context, 'tr')).toContain('Bakiyen');
  expect(paymentSpeech('settled', context, 'tr')).toBe('Tamamlandı. Zeynep, 1.000 dolar aldı.');
  expect(paymentSpeech('unknown', context, 'tr')).toContain('Tekrar ödeme yapma');
  expect(paymentErrorSpeech('Not confirmed. Nothing was sent.', 'Zeynep', 'tr')).toBe('Onaylanmadı. Hiçbir şey gönderilmedi.');
  expect(paymentSpeech('review', context, 'it')).toContain(`${new Intl.NumberFormat('it').format(1000)} dollari`);
});
