# Addendum (00:35) — handshake fails with `Bad MAC`

After the stack reset the phone could not even provision: `node.connectPeer` returns
`peer handshake did not complete within timeout`, right after `/lspinfo` succeeds
(instrumented with `[metevo-diag] provision` phases).

LSP LDK log at the exact attempt:

```
23:35:20.528 Received peer Init message from 022eb780... (features ...)
23:35:20.532 Error handling message; disconnecting peer with: Bad MAC
23:35:20.601 Got second connection with 022eb780..., closing
```

Gateway side for the same window: 71 `relay connected`, 163 `ws->tcp` frames of
50/66/84 bytes, **0 `tcp->ws` frames logged**. Noise handshake sizes are 50/66/66, so
the extra bytes and the repeated 3-frame bursts per connection point at a framing
mismatch between the SDK WS transport and raw TCP LDK (and/or several concurrent
sessions for one peer).

Consequence: with `Bad MAC` the LSP drops the peer immediately; `connectPeer` never
reports a completed handshake, so `/lsp/bootstrap` is never called and no delivery can
happen. The earlier `OpenChannel` rejection is downstream of the same transport issue.
This needs a transport-level fix (SDK framing vs gateway protocol) or the reference SDK
build that is proven against this gateway; it cannot be fixed from the app or helper.
