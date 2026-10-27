# Invoice relay: payer asks, recipient answers

A payer can name a saved contact and speak `send 20 dollars to Bob`. The
spoken name never leaves the phone: the app resolves it to Bob's node pubkey
and asks the LSP to relay an invoice request. The recipient's app shows the
request and creates the invoice on **its own node** only after the recipient
taps **Create invoice**. Nothing is created, and no money moves, before that
tap.

```
Alice app ──POST /metevo/invoice-request──▶ LSP ◀──GET /metevo/invoice-inbox── Bob app
Alice app ◀──POST /metevo/invoice-response── LSP ◀──POST /metevo/invoice-answer── Bob app (real invoice)
Alice app ──POST /sendpayment (own node)────────────────────────────────────────────▶ Bob node
```

The LSP stores only the request and the answer; it never touches either node,
so both wallets can sit behind NAT.

The payer does not trust the relayed invoice: its node decodes it and refuses
the payment when the payee, the USDm asset or the amount differ from what the
user reviewed.

## Relay API (all behind the APay bearer token)

| Route | Method | Body / query | Notes |
| --- | --- | --- | --- |
| `/metevo/invoice-request` | POST | `recipient_pubkey`, `sender_pubkey?`, `amount_usd`, `asset_id?` | returns `request_id` (64 hex) and `expires_at` (ms) |
| `/metevo/invoice-response` | POST | `request_id` | `pending`, `delivered` (+ invoice), `declined`, `expired` |
| `/metevo/invoice-inbox` | GET | `pubkey` | pending, unexpired requests for that node |
| `/metevo/invoice-answer` | POST | `request_id`, `recipient_pubkey`, `invoice` or `declined` | single use; 404 unknown, 403 other recipient, 409 already answered or expired |

Requests expire after `METEVO_INVOICE_EXPIRY` (10 minutes here). The payer
polls for up to 90 seconds.

## Running the demo (Bob's side as a script)

1. Start the stack and the relay (the LSP needs the relay build):

   ```bash
   cd metevo-final-app/infra/regtest
   ./regtest.sh up
   ./regtest.sh lsp-build      # builds ../../../utexo-lsp into utexo-lsp:latest
   ./regtest.sh lsp            # serves :8080, SQLite in a named volume
   adb reverse tcp:8080 tcp:8080
   ```

2. On the phone, add Bob once: **Contacts → Add contact**, name `Bob` and the
   pubkey from `./regtest.sh status` (or `./regtest.sh pubkey bob`). The
   bearer token comes from `scripts/device-wallet-config.json`
   (`lspBearerToken`), or `METEVO_LSP_APAY_TOKEN` in `infra/regtest/.env`.

3. Alice pays Bob: say `send 20 dollars to Bob`, then answer as Bob from the
   shell:

   ```bash
   ./regtest.sh relay-answer bob     # creates the USDm invoice on bob's node
   ```

   The phone gets the invoice, shows **To Bob, 20.00 USDm**, and confirms with
   biometrics. `relay-await <request_id>` prints the same invoice if you want
   to drive the payer from the shell instead.

4. Bob asks Alice (the recipient path inside the app):

   ```bash
   ./regtest.sh relay-request alice 20   # sender defaults to the other node
   ```

   Within a few seconds the phone opens **Invoice request from Bob**. Tap
   **Create invoice**: the app creates the invoice on alice's node and answers
   the relay. Then pay it from Bob's node:

   ```bash
   ./regtest.sh relay-await <request_id>   # or use the invoice from the log
   ./regtest.sh pay bob <invoice>
   ```

   The balance moves by 20 USDm after settlement.

## Tests

- `utexo-lsp`: `go test ./internal/lspapi` covers delivery, decline, expiry,
  auth, ownership and single-use answers against a real SQLite store.
- `metevo-final-app`: `tests/unit/InvoiceRelay.test.ts` covers the client
  contract (request, poll, inbox, answer) and `tests/unit/Contacts.test.ts`
  covers name/pubkey resolution and validation.

## Known limits

- One shared bearer token for every wallet: production needs per-wallet
  tokens and sender authentication. `sender_pubkey` is a hint for naming the
  request, not proof of identity; the app only shows a name when the pubkey
  matches a saved contact.
- Notification is in-app only while the wallet is open; there is no push or
  foreground service (`shortcut:` in `useInvoiceInbox.tsx`).
- The recipient must answer before the payer's 90-second window ends,
  otherwise the payer sees "did not answer in time" and the request stays
  pending until it expires.
