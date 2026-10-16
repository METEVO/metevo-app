/**
 * The six voice intents METEVO will recognise.
 *
 * Foundation phase: ids only (rendered as TODO cards). Adding an intent
 * means: extend this union, add a card component in
 * `src/components/intent-cards`, register it in `IntentCard`, and describe
 * it in `src/hooks/useIntents.ts`.
 */
export type IntentId =
  | 'send-usdm'
  | 'send-btc'
  | 'create-usdm-invoice'
  | 'read-transactions'
  | 'read-spending-overview'
  | 'read-balance';
