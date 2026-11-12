# USDm purchases

This build defaults to purchases **off**. Enable `EXPO_PUBLIC_REAL_USDM_PURCHASE=true`
only on a controlled test build. Mock mode cannot buy. The existing device
configuration supplies the LSP URL/token and RGB proxy; the wallet snapshot
must expose the expected USDm asset. Only whole USDm amounts, sats → USDm.

The review shows the actual invoice total, USDm amount, rate and expiry.
The LSP does not quote a separate fee; the card says so instead of inventing
one. An expired invoice or a runtime without invoice decoding cannot pay.
The existing device confirmation policy applies (biometrics/device lock when
configured, explicit confirm tap otherwise).

Orders live in SecureStore, separated by wallet node, mode and network.
Chunk writes precede the published snapshot head. Keep app data when testing
recovery: removing it also removes the purchase recovery record.
No invoice, hash, amount, recipient identity or preimage is logged. The
protected order is the approval/execution audit record; no preimage is stored.

Opening the wallet resumes already-submitted orders. This also works when
new purchases are disabled. Prepared orders require confirmation in the card.
A `paying` record after an interrupted submission is queried, never resubmitted.
The LSP's `delivered` response means `receiving` until the matching local
recipient transfer settles. Check saved purchase continues the same order.

## Device acceptance (pending)

Use regtest/signet funds and an explicitly confirmed 1 USDm order. Verify:

1. Exact sats/amount/expiry review, device confirmation, single submission.
2. RGB receive identity exists before the sats payment; USDm arrives locally.
3. Kill/reopen after payment, during claim and while receiving. The same order
   resumes without another payment or another receive invoice.
4. Disconnect/reconnect the LSP and repeat Check saved purchase: no duplicate.
5. Disable the purchase flag and reopen: existing submitted orders recover,
   while new quote/confirm actions remain disabled.

Record build SHA, network, device/runtime, final order stage and test results.
Do not attach invoices, hashes, tokens, receive identities or payment preimages.
No device purchase has been run from this editing environment.
