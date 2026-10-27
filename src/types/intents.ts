/**
 * Task contents the DynamicFrame can render.
 *
 * The voice-recognised intents are `send-usdm`, `send-btc`,
 * `create-usdm-invoice`, `read-transactions`, `read-spending-overview` and
 * `read-balance`; `contacts` is a canvas surface the home quick action
 * opens, and `invoice-request` is opened by the relay inbox when another
 * wallet asks this one for an invoice. Adding one means: extend this union,
 * add a card component in `src/components/intent-cards`, register it in
 * `IntentCard`, and describe it in `src/hooks/useIntents.ts`.
 */
export type IntentId =
  | 'send-usdm'
  | 'send-btc'
  | 'create-usdm-invoice'
  | 'read-transactions'
  | 'read-spending-overview'
  | 'read-balance'
  | 'contacts'
  | 'invoice-request';
