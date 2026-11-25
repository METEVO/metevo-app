import type { PaymentFlowStage } from '../../hooks/usePaymentFlow';
import type { VoiceLanguage } from '../../voice/language';
import { paymentMessage, PaymentMessageContext } from './paymentMessages';

export function paymentSpeech(stage: PaymentFlowStage, context: PaymentMessageContext, language: VoiceLanguage): string | null {
  if (language === 'en') return paymentMessage(stage, context).spoken;
  const { recipient, amount, balanceWarning, canCheckStatus } = context;
  const money = new Intl.NumberFormat(language).format(amount);
  const lines: Record<'tr' | 'it', Record<PaymentFlowStage, string | null>> = {
    tr: {
      idle: null, error: null,
      requesting: `${recipient} adlı kişinin kabul etmesi bekleniyor. METEVO uygulamasını açmasını iste.`,
      review: `${recipient} kabul etti. Tutarı kontrol et: ${money} dolar. ${balanceWarning ? 'Bakiyen bu ödemeden düşük görünüyor. Ödeme başarısız olabilir. ' : ''}Ardından onayla.`,
      authorizing: 'Cihazının kimlik doğrulamasıyla onayla.',
      submitting: 'Para gönderiliyor.',
      watching: 'Gönderildi. Ağın onayı bekleniyor.',
      settled: `Tamamlandı. ${recipient}, ${money} dolar aldı.`,
      failed: 'Ödeme başarısız oldu. Cüzdanından para çıkmadı.',
      unknown: `Ödemenin gönderilip gönderilmediği kesin değil. Tekrar ödeme yapma. ${canCheckStatus ? 'Durumu kontrol et düğmesine dokun.' : 'Önce işlem geçmişini kontrol et.'}`,
    },
    it: {
      idle: null, error: null,
      requesting: `In attesa che ${recipient} accetti. Chiedi di aprire METEVO.`,
      review: `${recipient} ha accettato. Controlla l'importo: ${money} dollari. ${balanceWarning ? 'Il saldo sembra insufficiente. Il pagamento potrebbe fallire. ' : ''}Poi conferma.`,
      authorizing: "Conferma con l'autenticazione del dispositivo.",
      submitting: 'Invio del denaro in corso.',
      watching: 'Inviato. In attesa della conferma della rete.',
      settled: `Fatto. ${recipient} ha ricevuto ${money} dollari.`,
      failed: 'Il pagamento non è riuscito. Nessun denaro è uscito dal portafoglio.',
      unknown: `Non sappiamo se il pagamento è stato inviato. Non pagare di nuovo. ${canCheckStatus ? 'Tocca Controlla stato.' : 'Controlla prima la cronologia.'}`,
    },
  };
  return lines[language][stage];
}

export function paymentErrorSpeech(note: string, recipient: string, language: VoiceLanguage): string {
  if (language === 'en') return note;
  const translations: Record<string, [string, string]> = {
    [`No contact named ${recipient}. Add their node pubkey in Contacts first.`]: [`${recipient} adlı kişi bulunamadı. Önce Kişiler bölümüne düğüm açık anahtarını ekle.`, `Nessun contatto di nome ${recipient}. Aggiungi prima la sua chiave pubblica nei contatti.`],
    [`${recipient} declined the request.`]: [`${recipient} isteği reddetti.`, `${recipient} ha rifiutato la richiesta.`],
    'The request expired before the invoice arrived.': ['Fatura gelmeden isteğin süresi doldu.', 'La richiesta è scaduta prima che arrivasse la fattura.'],
    'The recipient did not answer in time. Try again.': ['Alıcı zamanında yanıt vermedi. Tekrar dene.', 'Il destinatario non ha risposto in tempo. Riprova.'],
    'The invoice request failed. Try again.': ['Fatura isteği başarısız oldu. Tekrar dene.', 'La richiesta della fattura non è riuscita. Riprova.'],
    'Not confirmed. Nothing was sent.': ['Onaylanmadı. Hiçbir şey gönderilmedi.', 'Non confermato. Non è stato inviato nulla.'],
    'The invoice does not match what you reviewed. Nothing was paid.': ['Fatura, kontrol ettiğin bilgilerle eşleşmiyor. Ödeme yapılmadı.', 'La fattura non corrisponde ai dati controllati. Non è stato pagato nulla.'],
  };
  return translations[note]?.[language === 'tr' ? 0 : 1] ?? (language === 'tr' ? 'İşlem devam edemiyor. Ayrıntıları ekrandan kontrol et.' : 'Impossibile continuare. Controlla i dettagli sullo schermo.');
}
