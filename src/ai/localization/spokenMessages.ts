import { UiLanguage } from '../../hooks/useWalletSession';

/**
 * Spoken prose catalog for the voice pipeline.
 *
 * Language boundary rule (from the reference pipeline): canonical wallet
 * data stays unchanged - only fixed prose is localized, and each phrase is
 * written per language instead of machine-translated, so wallet terminology
 * stays correct (Italian uses "saldo", never "equilibrio").
 */

export type SpokenMessageId =
  | 'balanceReady'
  | 'receiveRequestParsed'
  | 'spendingReady'
  | 'historyReady'
  | 'swapNotSupported'
  | 'reviewAndConfirm'
  | 'missingTransferDetails'
  | 'didNotUnderstand'
  | 'requestCancelled'
  | 'reviewDetails'
  | 'emptyTranscription'
  | 'parsingError';

const MESSAGES: Record<SpokenMessageId, Record<UiLanguage, string>> = {
  balanceReady: {
    english: 'Your balance request is ready.',
    italiano: 'La tua richiesta di saldo è pronta.',
    turkce: 'Hesap bakiyesi sorgun hazır.',
    francais: 'Votre demande de solde est prête.',
    hindi: 'आपके खाते की शेष राशि की जानकारी का अनुरोध तैयार है।',
    espanol: 'Tu consulta de saldo está lista.',
    kiswahili: 'Ombi lako la salio liko tayari.',
  },
  receiveRequestParsed: {
    english: 'Your payment request has been parsed. Review the details.',
    italiano: 'La tua richiesta di pagamento è stata analizzata. Controlla i dettagli.',
    turkce: 'Ödeme talebiniz ayrıştırıldı. Ayrıntıları kontrol edin.',
    francais: 'Votre demande de paiement a été analysée. Vérifiez les détails.',
    hindi: 'आपका भुगतान अनुरोध पार्स हो गया है। विवरण जाँच लें।',
    espanol: 'Tu solicitud de pago fue analizada. Revisa los detalles.',
    kiswahili: 'Ombi lako la malipo limechambuliwa. Angalia maelezo.',
  },
  spendingReady: {
    english: 'Your spending summary request is ready.',
    italiano: 'La tua richiesta di riepilogo della spesa è pronta.',
    turkce: 'Harcama özeti sorgun hazır.',
    francais: 'Votre demande de résumé des dépenses est prête.',
    hindi: 'आपके खर्च के सारांश का अनुरोध तैयार है।',
    espanol: 'Tu resumen de gastos está listo.',
    kiswahili: 'Ombi lako la muhtasari wa matumizi liko tayari.',
  },
  historyReady: {
    english: 'Your transaction history request is ready.',
    italiano: 'La tua richiesta dello storico transazioni è pronta.',
    turkce: 'İşlem geçmişi sorgun hazır.',
    francais: 'Votre demande d’historique des transactions est prête.',
    hindi: 'आपके लेन-देन इतिहास का अनुरोध तैयार है।',
    espanol: 'Tu historial de transacciones está listo.',
    kiswahili: 'Ombi lako la historia ya miamala liko tayari.',
  },
  swapNotSupported: {
    english: 'Your swap request has been parsed. Execution is not supported.',
    italiano: 'La tua richiesta di scambio è stata analizzata. L’esecuzione non è supportata.',
    turkce: 'Takas isteğin ayrıştırıldı. Yürütme desteklenmiyor.',
    francais: 'Votre demande d’échange a été analysée. L’exécution n’est pas prise en charge.',
    hindi: 'आपका स्वैप अनुरोध पार्स हो गया है। निष्पादन समर्थित नहीं है।',
    espanol: 'Tu solicitud de intercambio fue analizada. La ejecución no está permitida.',
    kiswahili: 'Ombi lako la kubadilisha limechambuliwa. Kutendwa kunakataliwa.',
  },
  reviewAndConfirm: {
    english: 'Please review the payment details and confirm.',
    italiano: 'Controlla i dettagli del pagamento e conferma.',
    turkce: 'Lütfen ödeme ayrıntılarını kontrol et ve onayla.',
    francais: 'Veuillez vérifier les détails du paiement et confirmer.',
    hindi: 'कृपया भुगतान विवरण जाँचें और पुष्टि करें।',
    espanol: 'Revisa los detalles del pago y confirma.',
    kiswahili: 'Tafadhali angalia maelezo ya malipo kisha thibitisha.',
  },
  missingTransferDetails: {
    english: 'Please provide all transfer details in a new instruction.',
    italiano: 'Fornisci tutti i dettagli del trasferimento in un nuovo comando.',
    turkce: 'Lütfen tüm transfer ayrıntılarını yeni bir komutta belirt.',
    francais: 'Veuillez fournir tous les détails du transfert dans une nouvelle instruction.',
    hindi: 'कृपया सभी ट्रांसफर विवरण एक नए निर्देश में दें।',
    espanol: 'Indica todos los datos de la transferencia en una nueva instrucción.',
    kiswahili: 'Tafadhali toa maelezo yote ya uhamisho katika ombi jipya.',
  },
  didNotUnderstand: {
    english: 'I couldn’t understand your request. Please try again.',
    italiano: 'Non ho capito la tua richiesta. Riprova.',
    turkce: 'İsteğini anlayamadım. Lütfen tekrar dene.',
    francais: 'Je n’ai pas compris votre demande. Veuillez réessayer.',
    hindi: 'मैं आपका अनुरोध नहीं समझ पाया। कृपया फिर से प्रयास करें।',
    espanol: 'No entendí tu solicitud. Inténtalo de nuevo.',
    kiswahili: 'Sikuelewa ombi lako. Tafadhali jaribu tena.',
  },
  requestCancelled: {
    english: 'Transfer cancelled.',
    italiano: 'Trasferimento annullato.',
    turkce: 'Transfer iptal edildi.',
    francais: 'Transfert annulé.',
    hindi: 'ट्रांसफर रद्द कर दिया गया।',
    espanol: 'Transferencia cancelada.',
    kiswahili: 'Uhamisho umeghairbiwa.',
  },
  reviewDetails: {
    english: 'Review the details of your request.',
    italiano: 'Controlla i dettagli della tua richiesta.',
    turkce: 'İsteğinin ayrıntılarını kontrol et.',
    francais: 'Vérifiez les détails de votre demande.',
    hindi: 'अपने अनुरोध का विवरण जाँचें।',
    espanol: 'Revisa los detalles de tu solicitud.',
    kiswahili: 'Angalia maelezo ya ombi lako.',
  },
  emptyTranscription: {
    english: 'I didn’t catch any speech. Please try again.',
    italiano: 'Non ho registrato alcuna voce. Riprova.',
    turkce: 'Hiç ses kaydedemedim. Lütfen tekrar dene.',
    francais: 'Je n’ai entendu aucune voix. Veuillez réessayer.',
    hindi: 'मुझे कोई आवाज़ नहीं सुनाई दी। कृपया फिर से प्रयास करें।',
    espanol: 'No escuché ninguna voz. Inténtalo de nuevo.',
    kiswahili: 'Sikusikia sauti yoyote. Tafadhali jaribu tena.',
  },
  parsingError: {
    english: 'Something went wrong while reading your request. Please try again.',
    italiano: 'Qualcosa è andato storto nella lettura della richiesta. Riprova.',
    turkce: 'İsteğin okunurken bir sorun oluştu. Lütfen tekrar dene.',
    francais: 'Une erreur est survenue lors de la lecture de votre demande. Veuillez réessayer.',
    hindi: 'आपके अनुरोध को पढ़ने में कोई समस्या हुई। कृपया फिर से प्रयास करें।',
    espanol: 'Algo falló al leer tu solicitud. Inténtalo de nuevo.',
    kiswahili: 'Kunatatika kusoma ombi lako. Tafadhali jaribu tena.',
  },
};

/** The spoken phrase for a message id in the selected language. */
export function spokenMessage(id: SpokenMessageId, language: UiLanguage): string {
  return MESSAGES[id][language];
}
