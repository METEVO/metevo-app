/* tslint:disable */
/* eslint-disable */

export class RlnWasmInvoice {
    free(): void;
    [Symbol.dispose](): void;
    invoiceDataJson(): string;
    invoiceDataValue(): any;
    invoiceString(): string;
    constructor(invoice_string: string);
}

export class RlnWasmLnSocket {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    close(): Promise<void>;
    isClosed(): boolean;
    lastInboundSeqValue(): bigint;
    sendHex(payload_hex: string): Promise<void>;
    startReadLoop(on_message: Function): void;
    stopReadLoop(): void;
    websocketUrl(): string;
}

export class RlnWasmNode {
    free(): void;
    [Symbol.dispose](): void;
    apayNewJson(host_node_id: string): Promise<string>;
    /**
     * Async payments with LSP: register a fresh batch of payment hashes with the invoice-host /
     * LSP peer (`async_order.new`). Returns the host's order acknowledgement. Mirrors the native
     * SDK's `apay_new` / `/apay/new`.
     */
    apayNewValue(host_node_id: string): Promise<any>;
    apayNewWithAddressJson(host_node_id: string, username: string, domain: string): Promise<string>;
    /**
     * Like [`Self::apay_new_value`] but also attests a `username@domain` Lightning Address so the
     * LSP can serve inbound payments to that address. Mirrors `apay_new_with_address`.
     */
    apayNewWithAddressValue(host_node_id: string, username: string, domain: string): Promise<any>;
    attachWallet(wallet: RlnWasmWallet): void;
    autoDriveStartJson(interval_ms: number): string;
    /**
     * Start the autonomous drive loop: a self-scheduling timer that runs `node_drive_tick_once`
     * (chain sync → live LDK → event draining → authoritative channel reconcile) every
     * `interval_ms` (clamped to a sane minimum; `0` selects the default cadence). This lets apps
     * receive invoices / progress channels / settle HTLCs without hand-driving `chainSyncTick`,
     * mirroring the native daemon's background processor (PARITY_PLAN 0.2). Idempotent: calling it
     * while already running just returns the current status.
     */
    autoDriveStartValue(interval_ms: number): any;
    autoDriveStatusJson(): string;
    autoDriveStatusValue(): any;
    autoDriveStopJson(): string;
    autoDriveStopValue(): any;
    cancelHodlInvoiceJson(payment_hash: string): string;
    cancelHodlInvoiceValue(payment_hash: string): any;
    chainSyncEnqueueRebroadcastTx(txid: string, tx_hex: string): void;
    chainSyncStartJson(indexer_url: string, poll_interval_ms?: number | null): string;
    chainSyncStartValue(indexer_url: string, poll_interval_ms?: number | null): any;
    chainSyncStatusJson(): string;
    chainSyncStatusValue(): any;
    chainSyncStopJson(): string;
    chainSyncStopValue(): any;
    chainSyncTickJson(): Promise<string>;
    chainSyncTickValue(): Promise<any>;
    claimHodlInvoiceJson(payment_hash: string, payment_preimage: string): string;
    claimHodlInvoiceValue(payment_hash: string, payment_preimage: string): any;
    clearAutoPeerManagerHooks(): void;
    /**
     * Clear the VSS single-writer fence for this node's LDK store — the WASM
     * counterpart of the native SDK's `POST /vssclearfence`. Use when
     * `configureLdkVssReplication` fails with "owned by another instance" and that
     * owner can never release the fence itself: its browser profile was wiped (the
     * persisted fence id is gone) or the device is dead. After clearing, call
     * `configureLdkVssReplication` again — the new instance claims the fence and,
     * on a fresh device, runs the restore.
     *
     * Only clear the fence when the previous owner is truly gone: two live writers
     * on one VSS store corrupt each other's state (a still-running old owner will
     * stop itself at its next periodic fence check).
     *
     * Refused while replication is active on this node — call
     * `disableLdkVssReplication` first (mirrors native, where `/vssclearfence`
     * requires a locked node).
     */
    clearLdkVssFence(server_url: string, store_id: string, signing_key_hex: string): Promise<void>;
    closeAllPeers(): Promise<void>;
    closeChannel(channel_id: string): void;
    closeChannelWithOptions(channel_id: string, peer_pubkey: string | null | undefined, force: boolean): void;
    /**
     * Enable remote VSS replication of this node's state — LDK snapshots (channel
     * monitors, channel manager, network graph, scorer) plus the RGB KV store
     * (per-channel `RgbInfo`, payment/transfer info, consignments) — the WASM
     * counterpart of the native node's VSS KV replication. Best-effort: local
     * browser persistence stays the durability ack gate; VSS mirrors in the
     * background.
     *
     * Reuses the same VSS `server_url` + `signing_key` as the wallet backup, but
     * targets a **distinct** store id (`{store_id}-ldk`) so the LDK stream can never
     * collide with the wallet-backup stream. Call this **before** starting the node's
     * runtime: it also performs a one-time fresh-load restore (guarded — it will not
     * clobber a populated local store) so a fresh device recovers its channels from
     * VSS before the LDK object graph is built. Returns the number of keys restored.
     */
    configureLdkVssReplication(server_url: string, store_id: string, signing_key_hex: string): Promise<number>;
    connectPeer(peer_addr: string, peer_pubkey: string): Promise<void>;
    createHodlLnInvoiceJson(amt_msat: bigint | null | undefined, expiry_sec: number, asset_id: string | null | undefined, asset_amount: bigint | null | undefined, payment_hash: string): string;
    createHodlLnInvoiceValue(amt_msat: bigint | null | undefined, expiry_sec: number, asset_id: string | null | undefined, asset_amount: bigint | null | undefined, payment_hash: string): any;
    createLnInvoiceJson(amt_msat: bigint | null | undefined, expiry_sec: number, asset_id?: string | null, asset_amount?: bigint | null): string;
    createLnInvoiceLiveJson(amt_msat: bigint | null | undefined, expiry_sec: number, asset_id?: string | null, asset_amount?: bigint | null): string;
    /**
     * Create a BOLT11 invoice registered with the real live `ChannelManager`.
     */
    createLnInvoiceLiveValue(amt_msat: bigint | null | undefined, expiry_sec: number, asset_id?: string | null, asset_amount?: bigint | null): any;
    createLnInvoiceValue(amt_msat: bigint | null | undefined, expiry_sec: number, asset_id?: string | null, asset_amount?: bigint | null): any;
    decodeLnInvoiceJson(invoice: string): string;
    decodeLnInvoiceValue(invoice: string): any;
    decodeRgbInvoiceJson(invoice: string): string;
    decodeRgbInvoiceValue(invoice: string): any;
    /**
     * Disable VSS replication for this node (unregisters the replicator; queued
     * writes are dropped). Releases both the single-writer guards — the VSS fence
     * (best-effort, async) and the same-origin Web Lock — so another instance can
     * take over cleanly. Local persistence is unaffected.
     */
    disableLdkVssReplication(): void;
    disconnectPeer(peer_pubkey: string): Promise<void>;
    drainNativeRuntimeQueueJson(): string;
    drainNativeRuntimeQueueValue(): any;
    driveRgbFundingWork(): Promise<void>;
    enableVirtualChannelsV0Json(): string;
    enableVirtualChannelsV0Value(): any;
    failPendingPayments(): any;
    getChannelId(temporary_channel_id: string): string;
    getPaymentJson(payment_hash: string): string;
    getPaymentValue(payment_hash: string): any;
    ingestReadEventPayloadHex(payload_hex: string): any;
    ingestReadEventPayloadHexJson(payload_hex: string): string;
    ingestRuntimeTransportEventPayloadHexJson(payload_hex: string): string;
    ingestRuntimeTransportEventPayloadHexValue(payload_hex: string): any;
    installAutoPeerManagerHooks(): void;
    invoiceStatusJson(invoice: string): string;
    invoiceStatusValue(invoice: string): any;
    issueAssetCfaJson(request_js: any): string;
    issueAssetCfaValue(request_js: any): any;
    issueAssetIfaJson(request_js: any): string;
    issueAssetIfaValue(request_js: any): any;
    issueAssetNiaJson(request_js: any): string;
    issueAssetNiaValue(request_js: any): any;
    keysendJson(dest_pubkey: string, amt_msat: bigint, asset_id?: string | null, asset_amount?: bigint | null): string;
    keysendLiveJson(dest_pubkey: string, amt_msat: bigint, asset_id?: string | null, asset_amount?: bigint | null): string;
    /**
     * Send a REAL keysend (spontaneous) HTLC over a live channel via the wasm `ChannelManager`.
     *
     * Unlike [`keysend_value`], which records a parity-model payment that settles from the
     * event-stream, this constructs and routes an actual HTLC to `dest_pubkey` over the wire. The
     * returned record starts `pending`; poll [`live_payment_value`] until it becomes `succeeded`
     * (driven by a real `PaymentSent` event). Pass `asset_id`/`asset_amount` to ride RGB on it.
     */
    keysendLiveValue(dest_pubkey: string, amt_msat: bigint, asset_id?: string | null, asset_amount?: bigint | null): any;
    keysendValue(dest_pubkey: string, amt_msat: bigint, asset_id?: string | null, asset_amount?: bigint | null): any;
    ldkRuntimeComponentsJson(): string;
    ldkRuntimeComponentsValue(): any;
    ldkRuntimeStatusJson(): string;
    ldkRuntimeStatusValue(): any;
    /**
     * Health view for LDK VSS replication as JSON:
     * `{ configured, pendingWrites, lastError }`. `pendingWrites > 0` means some
     * state has not yet reached VSS (transient outage); alert if it stays non-zero.
     */
    ldkVssBackupInfoJson(): string;
    listChannelsJson(): string;
    listChannelsValue(): any;
    listPaymentsJson(): string;
    listPaymentsValue(): any;
    listPeersJson(): string;
    listPeersValue(): any;
    listPendingFundingRequestsJson(): string;
    listPendingFundingRequestsValue(): any;
    listRgbLnTransfersJson(): string;
    listRgbLnTransfersValue(): any;
    listRuntimeEventsJson(): string;
    listRuntimeEventsValue(): any;
    /**
     * Status of a single REAL payment by hex payment hash (from the live event stream), or null.
     */
    livePaymentValue(payment_hash: string): any;
    /**
     * Snapshot of all REAL payments tracked from the live `ChannelManager` event stream.
     */
    livePaymentsValue(): any;
    nativeRuntimeCoreStatusJson(): string;
    nativeRuntimeCoreStatusValue(): any;
    networkInfoJson(): string;
    networkInfoValue(): any;
    /**
     * Bare constructor. The network is left unset and adopted from the first attached wallet
     * (regtest defaults apply until then). For an explicit, native-style network selection use
     * [`new_with_node_runtime_id`](Self::new_with_node_runtime_id).
     */
    constructor(proxy_url: string);
    /**
     * Construct a node with an explicit Bitcoin network, mirroring the native node's `--network`.
     * The `network` string is one of `"mainnet" | "testnet" | "testnet4" | "signet" | "regtest"`
     * (case-insensitive). The node owns this network as its single source of truth: it drives the
     * LDK `ChannelManager`/`NetworkGraph` (and therefore the `Init` handshake chain), and
     * `attachWallet` will reject a wallet created on a different network.
     */
    static newWithNodeRuntimeId(proxy_url: string, node_runtime_id: string, network: string): RlnWasmNode;
    nodeInfoJson(): string;
    nodeInfoValue(): any;
    nodePubkeyJson(): string;
    nodePubkeyValue(): any;
    openChannelJson(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null): string;
    openChannelJsonWithOptions(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null, virtual_open_mode?: string | null): string;
    openChannelRgbJson(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id: string, asset_local_amount: bigint, contract_id: string, consignment_endpoint: string): string;
    openChannelValue(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null): any;
    openChannelValueWithOptions(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null, virtual_open_mode?: string | null, contract_id?: string | null, consignment_endpoint?: string | null): any;
    peerEngineStatusJson(): string;
    peerEngineStatusValue(): any;
    persistLdkRuntimeState(): void;
    processNativeRuntimeQueueJson(): string;
    processNativeRuntimeQueueValue(): any;
    processPendingRgbTransactions(): Promise<void>;
    reconnectManagerOnResume(): void;
    reconnectManagerStartJson(): string;
    reconnectManagerStartValue(): any;
    reconnectManagerStatusJson(): string;
    reconnectManagerStatusValue(): any;
    reconnectManagerStopJson(): string;
    reconnectManagerStopValue(): any;
    reconnectPersistedPeersJson(): Promise<string>;
    reconnectPersistedPeersValue(): Promise<any>;
    relaySessionAuthJson(): string;
    relaySessionAuthValue(): any;
    sendPaymentJson(invoice: string, amt_msat?: bigint | null, asset_id?: string | null, asset_amount?: bigint | null): string;
    sendPaymentLiveJson(invoice: string, amt_msat?: bigint | null, asset_id?: string | null, asset_amount?: bigint | null): string;
    /**
     * Pay a BOLT11 invoice using the real live `ChannelManager`.
     */
    sendPaymentLiveValue(invoice: string, amt_msat?: bigint | null, asset_id?: string | null, asset_amount?: bigint | null): any;
    sendPaymentValue(invoice: string, amt_msat?: bigint | null, asset_id?: string | null, asset_amount?: bigint | null): any;
    setEnableVirtualChannelsV0(enabled: boolean): void;
    setRelaySessionAuth(relay_auth_token?: string | null, relay_node_id?: string | null): void;
    signMessageJson(message: string): string;
    signMessageValue(message: string): any;
    submitFundingTransactionJson(submission_js: any): string;
    submitFundingTransactionValue(submission_js: any): any;
    updatePaymentStatus(payment_hash: string, status: string): any;
    updatePaymentStatusByInvoice(invoice: string, status: string): any;
    updatePaymentStatusByInvoiceJson(invoice: string, status: string): string;
    updatePaymentStatusJson(payment_hash: string, status: string): string;
}

export class RlnWasmPeerSession {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    close(): Promise<void>;
    isStarted(): boolean;
    start(): Promise<void>;
    stop(): void;
    websocketUrl(): string;
}

export class RlnWasmRustPeerManagerBridge {
    free(): void;
    [Symbol.dispose](): void;
    connectSession(proxy_url: string, peer_addr: string, peer_pubkey: string): Promise<RlnWasmPeerSession>;
    connectSessionWithOptions(proxy_url: string, peer_addr: string, peer_pubkey: string, options_js: any): Promise<RlnWasmPeerSession>;
    constructor(initial_outbound_hex?: string | null);
    setInitialOutboundHex(initial_outbound_hex: string): void;
    statsValue(): any;
}

export class RlnWasmSdk {
    free(): void;
    [Symbol.dispose](): void;
    attachWallet(node: RlnWasmNode, wallet: RlnWasmWallet): void;
    autoDriveStartJson(node: RlnWasmNode, interval_ms: number): string;
    autoDriveStartValue(node: RlnWasmNode, interval_ms: number): any;
    autoDriveStatusJson(node: RlnWasmNode): string;
    autoDriveStatusValue(node: RlnWasmNode): any;
    autoDriveStopJson(node: RlnWasmNode): string;
    autoDriveStopValue(node: RlnWasmNode): any;
    cancelHodlInvoiceJson(node: RlnWasmNode, payment_hash: string): string;
    cancelHodlInvoiceValue(node: RlnWasmNode, payment_hash: string): any;
    chainSyncEnqueueRebroadcastTx(node: RlnWasmNode, txid: string, tx_hex: string): void;
    chainSyncStartJson(node: RlnWasmNode, indexer_url: string, poll_interval_ms?: number | null): string;
    chainSyncStartValue(node: RlnWasmNode, indexer_url: string, poll_interval_ms?: number | null): any;
    chainSyncStatusJson(node: RlnWasmNode): string;
    chainSyncStatusValue(node: RlnWasmNode): any;
    chainSyncStopJson(node: RlnWasmNode): string;
    chainSyncStopValue(node: RlnWasmNode): any;
    chainSyncTickJson(node: RlnWasmNode): Promise<string>;
    chainSyncTickValue(node: RlnWasmNode): Promise<any>;
    claimHodlInvoiceJson(node: RlnWasmNode, payment_hash: string, payment_preimage: string): string;
    claimHodlInvoiceValue(node: RlnWasmNode, payment_hash: string, payment_preimage: string): any;
    clearAutoPeerManagerHooks(node: RlnWasmNode): void;
    clearDefaultRgbProxyTransport(): void;
    closeChannel(node: RlnWasmNode, channel_id: string): void;
    connectPeer(node: RlnWasmNode, peer_addr: string, peer_pubkey: string): Promise<void>;
    createHodlLnInvoiceJson(node: RlnWasmNode, amt_msat: bigint | null | undefined, expiry_sec: number, asset_id: string | null | undefined, asset_amount: bigint | null | undefined, payment_hash: string): string;
    createHodlLnInvoiceValue(node: RlnWasmNode, amt_msat: bigint | null | undefined, expiry_sec: number, asset_id: string | null | undefined, asset_amount: bigint | null | undefined, payment_hash: string): any;
    createLnInvoiceJson(node: RlnWasmNode, amt_msat: bigint | null | undefined, expiry_sec: number, asset_id?: string | null, asset_amount?: bigint | null): string;
    createLnInvoiceValue(node: RlnWasmNode, amt_msat: bigint | null | undefined, expiry_sec: number, asset_id?: string | null, asset_amount?: bigint | null): any;
    createNodeHandle(proxy_url: string): RlnWasmSdkNodeHandle;
    createNodeHandleWithRuntimeId(proxy_url: string, node_runtime_id: string): RlnWasmSdkNodeHandle;
    createWallet(wallet_data_json: string): Promise<RlnWasmWallet>;
    createWalletHandle(wallet_data_json: string): RlnWasmSdkWalletHandle;
    createWalletHandleAsync(wallet_data_json: string): Promise<RlnWasmSdkWalletHandle>;
    decodeLnInvoiceJson(node: RlnWasmNode, invoice: string): string;
    decodeLnInvoiceValue(node: RlnWasmNode, invoice: string): any;
    decodeRgbInvoiceJson(node: RlnWasmNode, invoice: string): string;
    decodeRgbInvoiceValue(node: RlnWasmNode, invoice: string): any;
    defaultEnableVirtualChannelsV0Json(): string;
    defaultEnableVirtualChannelsV0Value(): any;
    defaultRgbProxyTransportJson(): string;
    defaultRgbProxyTransportValue(): any;
    disconnectPeer(node: RlnWasmNode, peer_pubkey: string): Promise<void>;
    drainNativeRuntimeQueueJson(node: RlnWasmNode): string;
    drainNativeRuntimeQueueValue(node: RlnWasmNode): any;
    enableVirtualChannelsV0Json(node: RlnWasmNode): string;
    enableVirtualChannelsV0Value(node: RlnWasmNode): any;
    failPendingPayments(node: RlnWasmNode): any;
    getChannelId(node: RlnWasmNode, temporary_channel_id: string): string;
    getPaymentJson(node: RlnWasmNode, payment_hash: string): string;
    getPaymentValue(node: RlnWasmNode, payment_hash: string): any;
    getSwapJson(swap_string: string): Promise<string>;
    getSwapValue(swap_string: string): Promise<any>;
    healthcheck(): string;
    ingestReadEventPayloadHex(node: RlnWasmNode, payload_hex: string): any;
    ingestReadEventPayloadHexJson(node: RlnWasmNode, payload_hex: string): string;
    ingestRuntimeTransportEventPayloadHexJson(node: RlnWasmNode, payload_hex: string): string;
    ingestRuntimeTransportEventPayloadHexValue(node: RlnWasmNode, payload_hex: string): any;
    initJson(password: string, mnemonic?: string | null): Promise<string>;
    initValue(password: string, mnemonic?: string | null): Promise<any>;
    installAutoPeerManagerHooks(node: RlnWasmNode): void;
    invoiceStatusJson(node: RlnWasmNode, invoice: string): string;
    invoiceStatusValue(node: RlnWasmNode, invoice: string): any;
    issueAssetCfaJson(node: RlnWasmNode, request_js: any): string;
    issueAssetCfaValue(node: RlnWasmNode, request_js: any): any;
    issueAssetIfaJson(node: RlnWasmNode, request_js: any): string;
    issueAssetIfaValue(node: RlnWasmNode, request_js: any): any;
    issueAssetNiaJson(node: RlnWasmNode, request_js: any): string;
    issueAssetNiaValue(node: RlnWasmNode, request_js: any): any;
    issueAssetUdaJson(request_json: string): Promise<string>;
    issueAssetUdaValue(_request_json: string): Promise<any>;
    keysendJson(node: RlnWasmNode, dest_pubkey: string, amt_msat: bigint, asset_id?: string | null, asset_amount?: bigint | null): string;
    keysendValue(node: RlnWasmNode, dest_pubkey: string, amt_msat: bigint, asset_id?: string | null, asset_amount?: bigint | null): any;
    ldkRuntimeComponentsJson(node: RlnWasmNode): string;
    ldkRuntimeComponentsValue(node: RlnWasmNode): any;
    ldkRuntimeStatusJson(node: RlnWasmNode): string;
    ldkRuntimeStatusValue(node: RlnWasmNode): any;
    listChannelsJson(node: RlnWasmNode): string;
    listChannelsValue(node: RlnWasmNode): any;
    listPaymentsJson(node: RlnWasmNode): string;
    listPaymentsValue(node: RlnWasmNode): any;
    listPeersJson(node: RlnWasmNode): string;
    listPeersValue(node: RlnWasmNode): any;
    listPendingFundingRequestsJson(node: RlnWasmNode): string;
    listPendingFundingRequestsValue(node: RlnWasmNode): any;
    listRgbLnTransfersJson(node: RlnWasmNode): string;
    listRgbLnTransfersValue(node: RlnWasmNode): any;
    listRuntimeEventsJson(node: RlnWasmNode): string;
    listRuntimeEventsValue(node: RlnWasmNode): any;
    listSwapsJson(): Promise<string>;
    listSwapsValue(): Promise<any>;
    lock(): Promise<void>;
    makerExecuteJson(swap_string: string): Promise<string>;
    makerExecuteValue(swap_string: string): Promise<any>;
    makerInitJson(request_json: string): Promise<string>;
    makerInitValue(request_json: string): Promise<any>;
    nativeRuntimeCoreStatusJson(node: RlnWasmNode): string;
    nativeRuntimeCoreStatusValue(node: RlnWasmNode): any;
    networkInfoJson(node: RlnWasmNode): string;
    networkInfoValue(node: RlnWasmNode): any;
    constructor();
    newNode(proxy_url: string): RlnWasmNode;
    newNodeWithRuntimeId(proxy_url: string, node_runtime_id: string): RlnWasmNode;
    newWallet(wallet_data_json: string): RlnWasmWallet;
    nodeInfoJson(node: RlnWasmNode): string;
    nodeInfoValue(node: RlnWasmNode): any;
    nodePubkeyJson(node: RlnWasmNode): string;
    nodePubkeyValue(node: RlnWasmNode): any;
    openChannelJson(node: RlnWasmNode, peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null): string;
    openChannelValue(node: RlnWasmNode, peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null): any;
    postAssetMediaJson(mime: string, bytes_hex: string): Promise<string>;
    postAssetMediaValue(mime: string, bytes_hex: string): Promise<any>;
    preloadPersistentRuntimeState(): Promise<void>;
    processNativeRuntimeQueueJson(node: RlnWasmNode): string;
    processNativeRuntimeQueueValue(node: RlnWasmNode): any;
    reconnectManagerOnResume(node: RlnWasmNode): void;
    reconnectManagerStartJson(node: RlnWasmNode): string;
    reconnectManagerStartValue(node: RlnWasmNode): any;
    reconnectManagerStatusJson(node: RlnWasmNode): string;
    reconnectManagerStatusValue(node: RlnWasmNode): any;
    reconnectManagerStopJson(node: RlnWasmNode): string;
    reconnectManagerStopValue(node: RlnWasmNode): any;
    reconnectPersistedPeersJson(node: RlnWasmNode): Promise<string>;
    reconnectPersistedPeersValue(node: RlnWasmNode): Promise<any>;
    relaySessionAuthJson(node: RlnWasmNode): string;
    relaySessionAuthValue(node: RlnWasmNode): any;
    runtimeCapabilitiesJson(): string;
    runtimeCapabilitiesValue(): any;
    sendOnionMessage(request_json: string): Promise<void>;
    sendPaymentJson(node: RlnWasmNode, invoice: string, amt_msat?: bigint | null, asset_id?: string | null, asset_amount?: bigint | null): string;
    sendPaymentValue(node: RlnWasmNode, invoice: string, amt_msat?: bigint | null, asset_id?: string | null, asset_amount?: bigint | null): any;
    sendRgbFromGroupsJson(request_json: string): Promise<string>;
    sendRgbFromGroupsValue(_request_json: string): Promise<any>;
    setDefaultEnableVirtualChannelsV0(enabled: boolean): void;
    setDefaultRgbProxyTransport(endpoint: string, auth_token?: string | null, node_id?: string | null): void;
    setEnableVirtualChannelsV0(node: RlnWasmNode, enabled: boolean): void;
    setRelaySessionAuth(node: RlnWasmNode, relay_auth_token?: string | null, relay_node_id?: string | null): void;
    signMessageJson(node: RlnWasmNode, message: string): string;
    signMessageValue(node: RlnWasmNode, message: string): any;
    submitFundingTransactionJson(node: RlnWasmNode, submission_js: any): string;
    submitFundingTransactionValue(node: RlnWasmNode, submission_js: any): any;
    taker(request_json: string): Promise<void>;
    unlock(request_json: string): Promise<void>;
    updatePaymentStatus(node: RlnWasmNode, payment_hash: string, status: string): any;
    updatePaymentStatusByInvoice(node: RlnWasmNode, invoice: string, status: string): any;
    updatePaymentStatusByInvoiceJson(node: RlnWasmNode, invoice: string, status: string): string;
    updatePaymentStatusJson(node: RlnWasmNode, payment_hash: string, status: string): string;
    version(): string;
    walletClearRgbProxyTransport(wallet: RlnWasmWallet): void;
    walletGetAddress(wallet: RlnWasmWallet): string;
    walletGetAssetMediaJson(wallet: RlnWasmWallet, asset_id: string): string;
    walletGetAssetMediaValue(wallet: RlnWasmWallet, asset_id: string): any;
    walletGetBtcBalanceJson(wallet: RlnWasmWallet): string;
    walletGetBtcBalanceValue(wallet: RlnWasmWallet): any;
    walletIssueAssetUdaJson(wallet: RlnWasmWallet, request_js: any): string;
    walletIssueAssetUdaValue(wallet: RlnWasmWallet, request_js: any): any;
    walletListAssetsJson(wallet: RlnWasmWallet, filter_asset_schemas_js: any): string;
    walletListAssetsValue(wallet: RlnWasmWallet, filter_asset_schemas_js: any): any;
    walletListTransactionsJson(wallet: RlnWasmWallet): string;
    walletListTransactionsValue(wallet: RlnWasmWallet): any;
    walletRgbProxyTransportJson(wallet: RlnWasmWallet): string;
    walletRgbProxyTransportValue(wallet: RlnWasmWallet): any;
    walletSendRgbFromGroupsJson(wallet: RlnWasmWallet, request_js: any): Promise<string>;
    walletSendRgbFromGroupsValue(wallet: RlnWasmWallet, request_js: any): Promise<any>;
    walletSetRgbProxyTransport(wallet: RlnWasmWallet, endpoint: string, auth_token?: string | null, node_id?: string | null): void;
    walletSignPsbtJson(wallet: RlnWasmWallet, unsigned_psbt: string): string;
    walletSignPsbtValue(wallet: RlnWasmWallet, unsigned_psbt: string): string;
}

export class RlnWasmSdkNodeHandle {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    attachWallet(wallet: RlnWasmWallet): void;
    chainSyncEnqueueRebroadcastTx(txid: string, tx_hex: string): void;
    chainSyncStartJson(indexer_url: string, poll_interval_ms?: number | null): string;
    chainSyncStartValue(indexer_url: string, poll_interval_ms?: number | null): any;
    chainSyncStatusJson(): string;
    chainSyncStatusValue(): any;
    chainSyncStopJson(): string;
    chainSyncStopValue(): any;
    chainSyncTickJson(): Promise<string>;
    chainSyncTickValue(): Promise<any>;
    closeChannel(channel_id: string): void;
    closeChannelWithOptions(channel_id: string, peer_pubkey: string | null | undefined, force: boolean): void;
    connectPeer(peer_addr: string, peer_pubkey: string): Promise<void>;
    createLnInvoiceJson(amt_msat: bigint | null | undefined, expiry_sec: number, asset_id?: string | null, asset_amount?: bigint | null): string;
    decodeLnInvoiceJson(invoice: string): string;
    decodeLnInvoiceValue(invoice: string): any;
    decodeRgbInvoiceJson(invoice: string): string;
    decodeRgbInvoiceValue(invoice: string): any;
    disconnectPeer(peer_pubkey: string): Promise<void>;
    drainNativeRuntimeQueueJson(): string;
    drainNativeRuntimeQueueValue(): any;
    enableVirtualChannelsV0Json(): string;
    enableVirtualChannelsV0Value(): any;
    getChannelId(temporary_channel_id: string): string;
    getPaymentJson(payment_hash: string): string;
    getPaymentValue(payment_hash: string): any;
    ingestReadEventPayloadHex(payload_hex: string): any;
    ingestReadEventPayloadHexJson(payload_hex: string): string;
    ingestRuntimeTransportEventPayloadHexJson(payload_hex: string): string;
    ingestRuntimeTransportEventPayloadHexValue(payload_hex: string): any;
    invoiceStatusJson(invoice: string): string;
    invoiceStatusValue(invoice: string): any;
    issueAssetCfaJson(request_js: any): string;
    issueAssetCfaValue(request_js: any): any;
    issueAssetNiaJson(request_js: any): string;
    issueAssetNiaValue(request_js: any): any;
    keysendJson(dest_pubkey: string, amt_msat: bigint, asset_id?: string | null, asset_amount?: bigint | null): string;
    keysendValue(dest_pubkey: string, amt_msat: bigint, asset_id?: string | null, asset_amount?: bigint | null): any;
    ldkRuntimeComponentsJson(): string;
    ldkRuntimeComponentsValue(): any;
    ldkRuntimeStatusJson(): string;
    ldkRuntimeStatusValue(): any;
    listChannelsJson(): string;
    listChannelsValue(): any;
    listPaymentsJson(): string;
    listPaymentsValue(): any;
    listPeersJson(): string;
    listPeersValue(): any;
    listPendingFundingRequestsJson(): string;
    listPendingFundingRequestsValue(): any;
    listRgbLnTransfersJson(): string;
    listRgbLnTransfersValue(): any;
    listRuntimeEventsJson(): string;
    listRuntimeEventsValue(): any;
    nativeRuntimeCoreStatusJson(): string;
    nativeRuntimeCoreStatusValue(): any;
    networkInfoJson(): string;
    networkInfoValue(): any;
    nodeInfoJson(): string;
    nodeInfoValue(): any;
    nodePubkeyJson(): string;
    nodePubkeyValue(): any;
    openChannelJson(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null): string;
    openChannelJsonWithOptions(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null, virtual_open_mode?: string | null): string;
    openChannelValue(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null): any;
    openChannelValueWithOptions(peer_pubkey: string, capacity_sat: bigint, _public: boolean, asset_id?: string | null, asset_local_amount?: bigint | null, virtual_open_mode?: string | null): any;
    processNativeRuntimeQueueJson(): string;
    processNativeRuntimeQueueValue(): any;
    reconnectManagerOnResume(): void;
    reconnectManagerStartJson(): string;
    reconnectManagerStartValue(): any;
    reconnectManagerStatusJson(): string;
    reconnectManagerStatusValue(): any;
    reconnectManagerStopJson(): string;
    reconnectManagerStopValue(): any;
    reconnectPersistedPeersJson(): Promise<string>;
    reconnectPersistedPeersValue(): Promise<any>;
    relaySessionAuthJson(): string;
    relaySessionAuthValue(): any;
    sendPaymentJson(invoice: string, amt_msat?: bigint | null, asset_id?: string | null, asset_amount?: bigint | null): string;
    sendPaymentValue(invoice: string, amt_msat?: bigint | null, asset_id?: string | null, asset_amount?: bigint | null): any;
    setEnableVirtualChannelsV0(enabled: boolean): void;
    setRelaySessionAuth(relay_auth_token?: string | null, relay_node_id?: string | null): void;
    signMessageJson(message: string): string;
    signMessageValue(message: string): any;
    submitFundingTransactionJson(submission_js: any): string;
    submitFundingTransactionValue(submission_js: any): any;
    updatePaymentStatus(payment_hash: string, status: string): any;
    updatePaymentStatusByInvoice(invoice: string, status: string): any;
    updatePaymentStatusByInvoiceJson(invoice: string, status: string): string;
    updatePaymentStatusJson(payment_hash: string, status: string): string;
}

export class RlnWasmSdkWalletHandle {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    blindReceiveJson(asset_id: string | null | undefined, assignment_js: any, duration_seconds: number | null | undefined, transport_endpoints_js: any, min_confirmations: number): string;
    blindReceiveValue(asset_id: string | null | undefined, assignment_js: any, duration_seconds: number | null | undefined, transport_endpoints_js: any, min_confirmations: number): any;
    clearRgbProxyTransport(): void;
    getAddress(): string;
    getAssetMediaJson(asset_id: string): string;
    getAssetMediaValue(asset_id: string): any;
    getBtcBalanceJson(): string;
    getBtcBalanceValue(): any;
    getFeeEstimation(online_js: any, blocks: number): Promise<number>;
    getFeeEstimationJson(online_js: any, blocks: number): Promise<string>;
    goOnlineJson(skip_consistency_check: boolean, indexer_url: string): Promise<string>;
    goOnlineValue(skip_consistency_check: boolean, indexer_url: string): Promise<any>;
    issueAssetUdaJson(request_js: any): string;
    issueAssetUdaValue(request_js: any): any;
    listAssetsJson(filter_asset_schemas_js: any): string;
    listAssetsValue(filter_asset_schemas_js: any): any;
    listTransactionsJson(): string;
    listTransactionsValue(): any;
    refreshValue(online_js: any, asset_id: string | null | undefined, filter_js: any, skip_sync: boolean): Promise<any>;
    rgbProxyTransportJson(): string;
    rgbProxyTransportValue(): any;
    sendBtcBegin(online_js: any, address: string, amount: bigint, fee_rate: bigint, skip_sync: boolean): Promise<string>;
    sendRgbFromGroupsJson(request_js: any): Promise<string>;
    sendRgbFromGroupsValue(request_js: any): Promise<any>;
    setRgbProxyTransport(endpoint: string, auth_token?: string | null, node_id?: string | null): void;
    signPsbtJson(unsigned_psbt: string): string;
    signPsbtValue(unsigned_psbt: string): string;
    syncOnline(online_js: any): Promise<void>;
}

export class RlnWasmWallet {
    free(): void;
    [Symbol.dispose](): void;
    backup(password: string): Uint8Array;
    backupInfo(): boolean;
    backupInfoJson(): string;
    blindReceiveJson(asset_id: string | null | undefined, assignment_js: any, duration_seconds: number | null | undefined, transport_endpoints_js: any, min_confirmations: number): string;
    blindReceiveValue(asset_id: string | null | undefined, assignment_js: any, duration_seconds: number | null | undefined, transport_endpoints_js: any, min_confirmations: number): any;
    buildLightningFundingTxJson(online_js: any, output_script_hex: string, amount_sat: bigint, fee_rate: bigint): Promise<string>;
    /**
     * Build (but do **not** broadcast) a Lightning channel funding transaction that
     * pays `amount_sat` to the LDK-provided `output_script_hex`, using the wallet's
     * own UTXOs. Mirrors what `regular rgb-lightning-node` does internally on
     * `Event::FundingGenerationReady` (see `src/ldk.rs::send_btc_begin → sign_psbt
     * → extract_tx`), so WASM clients can fund their own channels without going
     * through the gateway's `dev/regtest/*` helpers.
     *
     * Result shape (JSON):
     * ```text
     * {
     *   "funding_tx_hex": <hex>,   // raw signed funding transaction
     *   "txid":           <hex>,
     *   "address":        <bech32>,
     *   "signed_psbt":    <base64> // useful for debugging / re-broadcast
     * }
     * ```
     *
     * Caller is expected to pass `funding_tx_hex` to
     * `RlnWasmNode.submitFundingTransactionValue({ funding_tx_hex, ... })` and
     * then trigger a broadcast (LDK's chain interface, or an out-of-band relay).
     * The wallet must already be `goOnline`'d and have sufficient confirmed BTC
     * to cover `amount_sat + fee`.
     */
    buildLightningFundingTxValue(online_js: any, output_script_hex: string, amount_sat: bigint, fee_rate: bigint): Promise<any>;
    clearRgbProxyTransport(): void;
    configureVssBackup(server_url: string, store_id: string, signing_key_hex: string): void;
    static create(wallet_data_json: string): Promise<RlnWasmWallet>;
    createUtxosBegin(online_js: any, up_to: boolean, num: number | null | undefined, size: number | null | undefined, fee_rate: bigint, skip_sync: boolean): Promise<string>;
    createUtxosEnd(online_js: any, signed_psbt: string, skip_sync: boolean): Promise<number>;
    createUtxosEndJson(online_js: any, signed_psbt: string, skip_sync: boolean): Promise<string>;
    /**
     * Errors with a retryable "wallet is busy" message if the wallet is
     * mid-operation — the disable must not be silently skipped, or backups would
     * keep flowing to a server the caller asked to disconnect from.
     */
    disableVssBackup(): void;
    drainToBegin(online_js: any, address: string, destroy_assets: boolean, fee_rate: bigint): Promise<string>;
    drainToEnd(online_js: any, signed_psbt: string): Promise<string>;
    failTransfers(online_js: any, batch_transfer_idx: number | null | undefined, no_asset_only: boolean, skip_sync: boolean): Promise<boolean>;
    failTransfersJson(online_js: any, batch_transfer_idx: number | null | undefined, no_asset_only: boolean, skip_sync: boolean): Promise<string>;
    getAddress(): string;
    getAssetBalanceJson(asset_id: string): string;
    getAssetBalanceValue(asset_id: string): any;
    getAssetMediaJson(asset_id: string): string;
    getAssetMediaValue(asset_id: string): any;
    getAssetMetadataJson(asset_id: string): string;
    getAssetMetadataValue(asset_id: string): any;
    getBtcBalanceJson(): string;
    getBtcBalanceValue(): any;
    getFeeEstimation(online_js: any, blocks: number): Promise<number>;
    getFeeEstimationJson(online_js: any, blocks: number): Promise<string>;
    getWalletDataJson(): string;
    getWalletDataValue(): any;
    goOnlineJson(skip_consistency_check: boolean, indexer_url: string): Promise<string>;
    goOnlineValue(skip_consistency_check: boolean, indexer_url: string): Promise<any>;
    inflateBegin(online_js: any, asset_id: string, inflation_amounts_js: any, fee_rate: bigint, min_confirmations: number): Promise<string>;
    inflateEndJson(online_js: any, signed_psbt: string): Promise<string>;
    inflateEndValue(online_js: any, signed_psbt: string): Promise<any>;
    issueAssetUdaJson(request_js: any): string;
    issueAssetUdaValue(request_js: any): any;
    listAssetsJson(filter_asset_schemas_js: any): string;
    listAssetsValue(filter_asset_schemas_js: any): any;
    listTransactionsJson(): string;
    listTransactionsValue(): any;
    listTransfersJson(asset_id?: string | null): string;
    listTransfersValue(asset_id?: string | null): any;
    listUnspentsJson(settled_only: boolean): string;
    listUnspentsValue(settled_only: boolean): any;
    listUnspentsVanillaJson(online_js: any, min_confirmations: number, skip_sync: boolean): Promise<string>;
    listUnspentsVanillaValue(online_js: any, min_confirmations: number, skip_sync: boolean): Promise<any>;
    constructor(wallet_data_json: string);
    refreshJson(online_js: any, asset_id: string | null | undefined, filter_js: any, skip_sync: boolean): Promise<string>;
    refreshValue(online_js: any, asset_id: string | null | undefined, filter_js: any, skip_sync: boolean): Promise<any>;
    restoreBackup(backup_bytes: Uint8Array, password: string): void;
    rgbProxyTransportJson(): string;
    rgbProxyTransportValue(): any;
    sendBegin(online_js: any, recipient_map_js: any, donation: boolean, fee_rate: bigint, min_confirmations: number): Promise<string>;
    sendBtcBegin(online_js: any, address: string, amount: bigint, fee_rate: bigint, skip_sync: boolean): Promise<string>;
    sendBtcEnd(online_js: any, signed_psbt: string, skip_sync: boolean): Promise<string>;
    sendEndJson(online_js: any, signed_psbt: string, skip_sync: boolean): Promise<string>;
    sendEndValue(online_js: any, signed_psbt: string, skip_sync: boolean): Promise<any>;
    sendRgbFromGroupsJson(request_js: any): Promise<string>;
    sendRgbFromGroupsValue(request_js: any): Promise<any>;
    setRgbProxyTransport(endpoint: string, auth_token?: string | null, node_id?: string | null): void;
    signPsbtJson(unsigned_psbt: string): string;
    signPsbtValue(unsigned_psbt: string): string;
    syncOnline(online_js: any): Promise<void>;
    vssBackupInfoJson(): Promise<string>;
    vssBackupInfoValue(): Promise<any>;
    vssBackupJson(): Promise<string>;
    vssBackupValue(): Promise<any>;
    vssRestoreBackup(): Promise<void>;
    witnessReceiveJson(asset_id: string | null | undefined, assignment_js: any, duration_seconds: number | null | undefined, transport_endpoints_js: any, min_confirmations: number): string;
    witnessReceiveValue(asset_id: string | null | undefined, assignment_js: any, duration_seconds: number | null | undefined, transport_endpoints_js: any, min_confirmations: number): any;
}

export function checkIndexerUrlJson(network: string, indexer_url: string): string;

export function checkIndexerUrlValue(network: string, indexer_url: string): any;

export function checkLnPeerWebsocketJson(proxy_url: string, peer_addr: string): Promise<string>;

export function checkLnPeerWebsocketValue(proxy_url: string, peer_addr: string): Promise<any>;

export function checkProxyUrl(proxy_url: string): Promise<void>;

export function clearPeerManagerHooks(): void;

export function hasPeerManagerHooks(): boolean;

export function hasPeerManagerHooksV2(): boolean;

export function installPeerManagerHooksFromJs(new_outbound_connection_cb: Function, read_event_cb: Function, process_events_cb: Function, socket_disconnected_cb: Function, report_error_cb: Function): void;

export function installPeerManagerHooksFromJsV2(new_outbound_connection_cb: Function, read_event_cb: Function, process_events_cb: Function, take_outbound_frames_cb: Function, socket_disconnected_cb: Function, report_error_cb: Function): void;

export function lnSocketConnect(proxy_url: string, peer_addr: string): Promise<RlnWasmLnSocket>;

export function lnSocketConnectWithOptions(proxy_url: string, peer_addr: string, options_js: any): Promise<RlnWasmLnSocket>;

export function peerSessionConnect(proxy_url: string, peer_addr: string, peer_pubkey: string, new_outbound_connection_cb: Function, read_event_cb: Function, process_events_cb: Function, socket_disconnected_cb: Function): Promise<RlnWasmPeerSession>;

export function peerSessionConnectWithErrorCb(proxy_url: string, peer_addr: string, peer_pubkey: string, new_outbound_connection_cb: Function, read_event_cb: Function, process_events_cb: Function, socket_disconnected_cb: Function, report_error_cb: Function): Promise<RlnWasmPeerSession>;

export function peerSessionConnectWithOptions(proxy_url: string, peer_addr: string, peer_pubkey: string, options_js: any, new_outbound_connection_cb: Function, read_event_cb: Function, process_events_cb: Function, socket_disconnected_cb: Function): Promise<RlnWasmPeerSession>;

export function peerSessionConnectWithOptionsAndErrorCb(proxy_url: string, peer_addr: string, peer_pubkey: string, options_js: any, new_outbound_connection_cb: Function, read_event_cb: Function, process_events_cb: Function, socket_disconnected_cb: Function, report_error_cb: Function): Promise<RlnWasmPeerSession>;

export function rgbGenerateKeysJson(network: string): string;

export function rgbGenerateKeysValue(network: string): any;

export function rgbRestoreKeysJson(network: string, mnemonic: string): string;

export function rgbRestoreKeysValue(network: string, mnemonic: string): any;

export function wasm_init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_rlnwasmnode_free: (a: number, b: number) => void;
    readonly rlnwasmnode_apayNewJson: (a: number, b: number, c: number) => any;
    readonly rlnwasmnode_apayNewValue: (a: number, b: number, c: number) => any;
    readonly rlnwasmnode_apayNewWithAddressJson: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly rlnwasmnode_apayNewWithAddressValue: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly rlnwasmnode_attachWallet: (a: number, b: number) => [number, number];
    readonly rlnwasmnode_autoDriveStartJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmnode_autoDriveStartValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmnode_autoDriveStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_autoDriveStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_autoDriveStopJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_autoDriveStopValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_cancelHodlInvoiceJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_cancelHodlInvoiceValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_chainSyncEnqueueRebroadcastTx: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly rlnwasmnode_chainSyncStartJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmnode_chainSyncStartValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmnode_chainSyncStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_chainSyncStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_chainSyncStopJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_chainSyncStopValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_chainSyncTickJson: (a: number) => any;
    readonly rlnwasmnode_chainSyncTickValue: (a: number) => any;
    readonly rlnwasmnode_claimHodlInvoiceJson: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly rlnwasmnode_claimHodlInvoiceValue: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly rlnwasmnode_clearAutoPeerManagerHooks: (a: number) => void;
    readonly rlnwasmnode_clearLdkVssFence: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly rlnwasmnode_closeAllPeers: (a: number) => any;
    readonly rlnwasmnode_closeChannel: (a: number, b: number, c: number) => [number, number];
    readonly rlnwasmnode_closeChannelWithOptions: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly rlnwasmnode_configureLdkVssReplication: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly rlnwasmnode_connectPeer: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly rlnwasmnode_createHodlLnInvoiceJson: (a: number, b: number, c: bigint, d: number, e: number, f: number, g: number, h: bigint, i: number, j: number) => [number, number, number, number];
    readonly rlnwasmnode_createHodlLnInvoiceValue: (a: number, b: number, c: bigint, d: number, e: number, f: number, g: number, h: bigint, i: number, j: number) => [number, number, number];
    readonly rlnwasmnode_createLnInvoiceJson: (a: number, b: number, c: bigint, d: number, e: number, f: number, g: number, h: bigint) => [number, number, number, number];
    readonly rlnwasmnode_createLnInvoiceLiveJson: (a: number, b: number, c: bigint, d: number, e: number, f: number, g: number, h: bigint) => [number, number, number, number];
    readonly rlnwasmnode_createLnInvoiceLiveValue: (a: number, b: number, c: bigint, d: number, e: number, f: number, g: number, h: bigint) => [number, number, number];
    readonly rlnwasmnode_createLnInvoiceValue: (a: number, b: number, c: bigint, d: number, e: number, f: number, g: number, h: bigint) => [number, number, number];
    readonly rlnwasmnode_decodeLnInvoiceJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_decodeLnInvoiceValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_decodeRgbInvoiceJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_decodeRgbInvoiceValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_disableLdkVssReplication: (a: number) => void;
    readonly rlnwasmnode_disconnectPeer: (a: number, b: number, c: number) => any;
    readonly rlnwasmnode_drainNativeRuntimeQueueJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_drainNativeRuntimeQueueValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_driveRgbFundingWork: (a: number) => any;
    readonly rlnwasmnode_enableVirtualChannelsV0Json: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_enableVirtualChannelsV0Value: (a: number) => [number, number, number];
    readonly rlnwasmnode_failPendingPayments: (a: number) => [number, number, number];
    readonly rlnwasmnode_getChannelId: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_getPaymentJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_getPaymentValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_ingestReadEventPayloadHex: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_ingestReadEventPayloadHexJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_ingestRuntimeTransportEventPayloadHexJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_ingestRuntimeTransportEventPayloadHexValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_installAutoPeerManagerHooks: (a: number) => void;
    readonly rlnwasmnode_invoiceStatusJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_invoiceStatusValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_issueAssetCfaJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmnode_issueAssetCfaValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmnode_issueAssetIfaJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmnode_issueAssetIfaValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmnode_issueAssetNiaJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmnode_issueAssetNiaValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmnode_keysendJson: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: bigint) => [number, number, number, number];
    readonly rlnwasmnode_keysendLiveJson: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: bigint) => [number, number, number, number];
    readonly rlnwasmnode_keysendLiveValue: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: bigint) => [number, number, number];
    readonly rlnwasmnode_keysendValue: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: bigint) => [number, number, number];
    readonly rlnwasmnode_ldkRuntimeComponentsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_ldkRuntimeComponentsValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_ldkRuntimeStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_ldkRuntimeStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_ldkVssBackupInfoJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_listChannelsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_listChannelsValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_listPaymentsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_listPaymentsValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_listPeersJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_listPeersValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_listPendingFundingRequestsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_listPendingFundingRequestsValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_listRgbLnTransfersJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_listRgbLnTransfersValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_listRuntimeEventsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_listRuntimeEventsValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_livePaymentValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_livePaymentsValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_nativeRuntimeCoreStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_nativeRuntimeCoreStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_networkInfoJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_networkInfoValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_new: (a: number, b: number) => [number, number, number];
    readonly rlnwasmnode_newWithNodeRuntimeId: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly rlnwasmnode_nodeInfoJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_nodeInfoValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_nodePubkeyJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_nodePubkeyValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_openChannelJson: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint) => [number, number, number, number];
    readonly rlnwasmnode_openChannelJsonWithOptions: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint, j: number, k: number) => [number, number, number, number];
    readonly rlnwasmnode_openChannelRgbJson: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: bigint, i: number, j: number, k: number, l: number) => [number, number, number, number];
    readonly rlnwasmnode_openChannelValue: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint) => [number, number, number];
    readonly rlnwasmnode_openChannelValueWithOptions: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint, j: number, k: number, l: number, m: number, n: number, o: number) => [number, number, number];
    readonly rlnwasmnode_peerEngineStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_peerEngineStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_persistLdkRuntimeState: (a: number) => [number, number];
    readonly rlnwasmnode_processNativeRuntimeQueueJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_processNativeRuntimeQueueValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_processPendingRgbTransactions: (a: number) => any;
    readonly rlnwasmnode_reconnectManagerOnResume: (a: number) => void;
    readonly rlnwasmnode_reconnectManagerStartJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_reconnectManagerStartValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_reconnectManagerStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_reconnectManagerStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_reconnectManagerStopJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_reconnectManagerStopValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_reconnectPersistedPeersJson: (a: number) => any;
    readonly rlnwasmnode_reconnectPersistedPeersValue: (a: number) => any;
    readonly rlnwasmnode_relaySessionAuthJson: (a: number) => [number, number, number, number];
    readonly rlnwasmnode_relaySessionAuthValue: (a: number) => [number, number, number];
    readonly rlnwasmnode_sendPaymentJson: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: bigint) => [number, number, number, number];
    readonly rlnwasmnode_sendPaymentLiveJson: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: bigint) => [number, number, number, number];
    readonly rlnwasmnode_sendPaymentLiveValue: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: bigint) => [number, number, number];
    readonly rlnwasmnode_sendPaymentValue: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: bigint) => [number, number, number];
    readonly rlnwasmnode_setEnableVirtualChannelsV0: (a: number, b: number) => void;
    readonly rlnwasmnode_setRelaySessionAuth: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly rlnwasmnode_signMessageJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmnode_signMessageValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmnode_submitFundingTransactionJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmnode_submitFundingTransactionValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmnode_updatePaymentStatus: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly rlnwasmnode_updatePaymentStatusByInvoice: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly rlnwasmnode_updatePaymentStatusByInvoiceJson: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly rlnwasmnode_updatePaymentStatusJson: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly __wbg_rlnwasmlnsocket_free: (a: number, b: number) => void;
    readonly __wbg_rlnwasmpeersession_free: (a: number, b: number) => void;
    readonly __wbg_rlnwasmrustpeermanagerbridge_free: (a: number, b: number) => void;
    readonly hasPeerManagerHooks: () => number;
    readonly hasPeerManagerHooksV2: () => number;
    readonly lnSocketConnect: (a: number, b: number, c: number, d: number) => any;
    readonly lnSocketConnectWithOptions: (a: number, b: number, c: number, d: number, e: any) => any;
    readonly peerSessionConnect: (a: number, b: number, c: number, d: number, e: number, f: number, g: any, h: any, i: any, j: any) => any;
    readonly peerSessionConnectWithErrorCb: (a: number, b: number, c: number, d: number, e: number, f: number, g: any, h: any, i: any, j: any, k: any) => any;
    readonly peerSessionConnectWithOptions: (a: number, b: number, c: number, d: number, e: number, f: number, g: any, h: any, i: any, j: any, k: any) => any;
    readonly peerSessionConnectWithOptionsAndErrorCb: (a: number, b: number, c: number, d: number, e: number, f: number, g: any, h: any, i: any, j: any, k: any, l: any) => any;
    readonly rlnwasmlnsocket_close: (a: number) => any;
    readonly rlnwasmlnsocket_isClosed: (a: number) => number;
    readonly rlnwasmlnsocket_lastInboundSeqValue: (a: number) => bigint;
    readonly rlnwasmlnsocket_sendHex: (a: number, b: number, c: number) => any;
    readonly rlnwasmlnsocket_startReadLoop: (a: number, b: any) => [number, number];
    readonly rlnwasmlnsocket_stopReadLoop: (a: number) => void;
    readonly rlnwasmlnsocket_websocketUrl: (a: number) => [number, number];
    readonly rlnwasmpeersession_close: (a: number) => any;
    readonly rlnwasmpeersession_isStarted: (a: number) => number;
    readonly rlnwasmpeersession_start: (a: number) => any;
    readonly rlnwasmpeersession_stop: (a: number) => void;
    readonly rlnwasmpeersession_websocketUrl: (a: number) => [number, number];
    readonly rlnwasmrustpeermanagerbridge_connectSession: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
    readonly rlnwasmrustpeermanagerbridge_connectSessionWithOptions: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: any) => any;
    readonly rlnwasmrustpeermanagerbridge_new: (a: number, b: number) => [number, number, number];
    readonly rlnwasmrustpeermanagerbridge_setInitialOutboundHex: (a: number, b: number, c: number) => [number, number];
    readonly rlnwasmrustpeermanagerbridge_statsValue: (a: number) => [number, number, number];
    readonly installPeerManagerHooksFromJs: (a: any, b: any, c: any, d: any, e: any) => void;
    readonly installPeerManagerHooksFromJsV2: (a: any, b: any, c: any, d: any, e: any, f: any) => void;
    readonly clearPeerManagerHooks: () => void;
    readonly __wbg_rlnwasminvoice_free: (a: number, b: number) => void;
    readonly __wbg_rlnwasmsdk_free: (a: number, b: number) => void;
    readonly __wbg_rlnwasmsdknodehandle_free: (a: number, b: number) => void;
    readonly __wbg_rlnwasmsdkwallethandle_free: (a: number, b: number) => void;
    readonly __wbg_rlnwasmwallet_free: (a: number, b: number) => void;
    readonly checkIndexerUrlJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly checkIndexerUrlValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly checkLnPeerWebsocketJson: (a: number, b: number, c: number, d: number) => any;
    readonly checkLnPeerWebsocketValue: (a: number, b: number, c: number, d: number) => any;
    readonly checkProxyUrl: (a: number, b: number) => any;
    readonly rgbGenerateKeysJson: (a: number, b: number) => [number, number, number, number];
    readonly rgbGenerateKeysValue: (a: number, b: number) => [number, number, number];
    readonly rgbRestoreKeysJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rgbRestoreKeysValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasminvoice_invoiceDataJson: (a: number) => [number, number, number, number];
    readonly rlnwasminvoice_invoiceDataValue: (a: number) => [number, number, number];
    readonly rlnwasminvoice_invoiceString: (a: number) => [number, number];
    readonly rlnwasminvoice_new: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_attachWallet: (a: number, b: number, c: number) => [number, number];
    readonly rlnwasmsdk_autoDriveStartJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdk_autoDriveStartValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdk_autoDriveStatusJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_autoDriveStatusValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_autoDriveStopJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_autoDriveStopValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_cancelHodlInvoiceJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_cancelHodlInvoiceValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_chainSyncEnqueueRebroadcastTx: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly rlnwasmsdk_chainSyncStartJson: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly rlnwasmsdk_chainSyncStartValue: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly rlnwasmsdk_chainSyncStatusJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_chainSyncStatusValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_chainSyncStopJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_chainSyncStopValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_chainSyncTickJson: (a: number, b: number) => any;
    readonly rlnwasmsdk_chainSyncTickValue: (a: number, b: number) => any;
    readonly rlnwasmsdk_claimHodlInvoiceJson: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly rlnwasmsdk_claimHodlInvoiceValue: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly rlnwasmsdk_clearAutoPeerManagerHooks: (a: number, b: number) => void;
    readonly rlnwasmsdk_clearDefaultRgbProxyTransport: (a: number) => void;
    readonly rlnwasmsdk_closeChannel: (a: number, b: number, c: number, d: number) => [number, number];
    readonly rlnwasmsdk_connectPeer: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
    readonly rlnwasmsdk_createHodlLnInvoiceJson: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint, j: number, k: number) => [number, number, number, number];
    readonly rlnwasmsdk_createHodlLnInvoiceValue: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint, j: number, k: number) => [number, number, number];
    readonly rlnwasmsdk_createLnInvoiceJson: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint) => [number, number, number, number];
    readonly rlnwasmsdk_createLnInvoiceValue: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint) => [number, number, number];
    readonly rlnwasmsdk_createNodeHandle: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdk_createNodeHandleWithRuntimeId: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly rlnwasmsdk_createWallet: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_createWalletHandle: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdk_createWalletHandleAsync: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_decodeLnInvoiceJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_decodeLnInvoiceValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_decodeRgbInvoiceJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_decodeRgbInvoiceValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_defaultEnableVirtualChannelsV0Json: (a: number) => [number, number, number, number];
    readonly rlnwasmsdk_defaultEnableVirtualChannelsV0Value: (a: number) => [number, number, number];
    readonly rlnwasmsdk_defaultRgbProxyTransportJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdk_defaultRgbProxyTransportValue: (a: number) => [number, number, number];
    readonly rlnwasmsdk_disconnectPeer: (a: number, b: number, c: number, d: number) => any;
    readonly rlnwasmsdk_drainNativeRuntimeQueueJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_drainNativeRuntimeQueueValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_enableVirtualChannelsV0Json: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_enableVirtualChannelsV0Value: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_failPendingPayments: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_getChannelId: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_getPaymentJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_getPaymentValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_getSwapJson: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_getSwapValue: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_healthcheck: (a: number) => [number, number];
    readonly rlnwasmsdk_ingestReadEventPayloadHex: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_ingestReadEventPayloadHexJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_ingestRuntimeTransportEventPayloadHexJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_ingestRuntimeTransportEventPayloadHexValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_initJson: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly rlnwasmsdk_initValue: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly rlnwasmsdk_installAutoPeerManagerHooks: (a: number, b: number) => void;
    readonly rlnwasmsdk_invoiceStatusJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_invoiceStatusValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_issueAssetCfaJson: (a: number, b: number, c: any) => [number, number, number, number];
    readonly rlnwasmsdk_issueAssetCfaValue: (a: number, b: number, c: any) => [number, number, number];
    readonly rlnwasmsdk_issueAssetIfaJson: (a: number, b: number, c: any) => [number, number, number, number];
    readonly rlnwasmsdk_issueAssetIfaValue: (a: number, b: number, c: any) => [number, number, number];
    readonly rlnwasmsdk_issueAssetNiaJson: (a: number, b: number, c: any) => [number, number, number, number];
    readonly rlnwasmsdk_issueAssetNiaValue: (a: number, b: number, c: any) => [number, number, number];
    readonly rlnwasmsdk_issueAssetUdaJson: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_issueAssetUdaValue: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_keysendJson: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: bigint) => [number, number, number, number];
    readonly rlnwasmsdk_keysendValue: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: bigint) => [number, number, number];
    readonly rlnwasmsdk_ldkRuntimeComponentsJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_ldkRuntimeComponentsValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_ldkRuntimeStatusJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_ldkRuntimeStatusValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_listChannelsJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_listChannelsValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_listPaymentsJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_listPaymentsValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_listPeersJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_listPeersValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_listPendingFundingRequestsJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_listPendingFundingRequestsValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_listRgbLnTransfersJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_listRgbLnTransfersValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_listRuntimeEventsJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_listRuntimeEventsValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_listSwapsJson: (a: number) => any;
    readonly rlnwasmsdk_listSwapsValue: (a: number) => any;
    readonly rlnwasmsdk_lock: (a: number) => any;
    readonly rlnwasmsdk_makerExecuteJson: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_makerExecuteValue: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_makerInitJson: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_makerInitValue: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_nativeRuntimeCoreStatusJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_nativeRuntimeCoreStatusValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_networkInfoJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_networkInfoValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_newNode: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdk_newNodeWithRuntimeId: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly rlnwasmsdk_nodeInfoJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_nodeInfoValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_nodePubkeyJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_nodePubkeyValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_openChannelJson: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: number, j: bigint) => [number, number, number, number];
    readonly rlnwasmsdk_openChannelValue: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: number, j: bigint) => [number, number, number];
    readonly rlnwasmsdk_postAssetMediaJson: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly rlnwasmsdk_postAssetMediaValue: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly rlnwasmsdk_preloadPersistentRuntimeState: (a: number) => any;
    readonly rlnwasmsdk_processNativeRuntimeQueueJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_processNativeRuntimeQueueValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_reconnectManagerOnResume: (a: number, b: number) => void;
    readonly rlnwasmsdk_reconnectManagerStartJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_reconnectManagerStartValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_reconnectManagerStatusJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_reconnectManagerStatusValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_reconnectManagerStopJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_reconnectManagerStopValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_reconnectPersistedPeersJson: (a: number, b: number) => any;
    readonly rlnwasmsdk_reconnectPersistedPeersValue: (a: number, b: number) => any;
    readonly rlnwasmsdk_relaySessionAuthJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_relaySessionAuthValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_runtimeCapabilitiesJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdk_runtimeCapabilitiesValue: (a: number) => [number, number, number];
    readonly rlnwasmsdk_sendOnionMessage: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_sendPaymentJson: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: number, i: number, j: bigint) => [number, number, number, number];
    readonly rlnwasmsdk_sendPaymentValue: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: number, i: number, j: bigint) => [number, number, number];
    readonly rlnwasmsdk_sendRgbFromGroupsJson: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_sendRgbFromGroupsValue: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_setDefaultEnableVirtualChannelsV0: (a: number, b: number) => void;
    readonly rlnwasmsdk_setDefaultRgbProxyTransport: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly rlnwasmsdk_setEnableVirtualChannelsV0: (a: number, b: number, c: number) => void;
    readonly rlnwasmsdk_setRelaySessionAuth: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly rlnwasmsdk_signMessageJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_signMessageValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_submitFundingTransactionJson: (a: number, b: number, c: any) => [number, number, number, number];
    readonly rlnwasmsdk_submitFundingTransactionValue: (a: number, b: number, c: any) => [number, number, number];
    readonly rlnwasmsdk_taker: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_unlock: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdk_updatePaymentStatus: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly rlnwasmsdk_updatePaymentStatusByInvoice: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly rlnwasmsdk_updatePaymentStatusByInvoiceJson: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly rlnwasmsdk_updatePaymentStatusJson: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly rlnwasmsdk_version: (a: number) => [number, number];
    readonly rlnwasmsdk_walletClearRgbProxyTransport: (a: number, b: number) => [number, number];
    readonly rlnwasmsdk_walletGetAddress: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_walletGetAssetMediaJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_walletGetAssetMediaValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdk_walletGetBtcBalanceJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_walletGetBtcBalanceValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_walletIssueAssetUdaJson: (a: number, b: number, c: any) => [number, number, number, number];
    readonly rlnwasmsdk_walletIssueAssetUdaValue: (a: number, b: number, c: any) => [number, number, number];
    readonly rlnwasmsdk_walletListAssetsJson: (a: number, b: number, c: any) => [number, number, number, number];
    readonly rlnwasmsdk_walletListAssetsValue: (a: number, b: number, c: any) => [number, number, number];
    readonly rlnwasmsdk_walletListTransactionsJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_walletListTransactionsValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_walletRgbProxyTransportJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmsdk_walletRgbProxyTransportValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmsdk_walletSendRgbFromGroupsJson: (a: number, b: number, c: any) => any;
    readonly rlnwasmsdk_walletSendRgbFromGroupsValue: (a: number, b: number, c: any) => any;
    readonly rlnwasmsdk_walletSetRgbProxyTransport: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly rlnwasmsdk_walletSignPsbtJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_attachWallet: (a: number, b: number) => [number, number];
    readonly rlnwasmsdknodehandle_chainSyncEnqueueRebroadcastTx: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly rlnwasmsdknodehandle_chainSyncStartJson: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_chainSyncStartValue: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_chainSyncStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_chainSyncStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_chainSyncStopJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_chainSyncStopValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_chainSyncTickJson: (a: number) => any;
    readonly rlnwasmsdknodehandle_chainSyncTickValue: (a: number) => any;
    readonly rlnwasmsdknodehandle_closeChannel: (a: number, b: number, c: number) => [number, number];
    readonly rlnwasmsdknodehandle_closeChannelWithOptions: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly rlnwasmsdknodehandle_connectPeer: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly rlnwasmsdknodehandle_createLnInvoiceJson: (a: number, b: number, c: bigint, d: number, e: number, f: number, g: number, h: bigint) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_decodeLnInvoiceJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_decodeLnInvoiceValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_decodeRgbInvoiceJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_decodeRgbInvoiceValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_disconnectPeer: (a: number, b: number, c: number) => any;
    readonly rlnwasmsdknodehandle_drainNativeRuntimeQueueJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_drainNativeRuntimeQueueValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_enableVirtualChannelsV0Json: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_enableVirtualChannelsV0Value: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_getChannelId: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_getPaymentJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_getPaymentValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_ingestReadEventPayloadHex: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_ingestReadEventPayloadHexJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_ingestRuntimeTransportEventPayloadHexJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_ingestRuntimeTransportEventPayloadHexValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_invoiceStatusJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_invoiceStatusValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_issueAssetCfaJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_issueAssetCfaValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmsdknodehandle_issueAssetNiaJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_issueAssetNiaValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmsdknodehandle_keysendJson: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: bigint) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_keysendValue: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: bigint) => [number, number, number];
    readonly rlnwasmsdknodehandle_ldkRuntimeComponentsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_ldkRuntimeComponentsValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_ldkRuntimeStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_ldkRuntimeStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_listChannelsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_listChannelsValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_listPaymentsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_listPaymentsValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_listPeersJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_listPeersValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_listPendingFundingRequestsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_listPendingFundingRequestsValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_listRgbLnTransfersJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_listRgbLnTransfersValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_listRuntimeEventsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_listRuntimeEventsValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_nativeRuntimeCoreStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_nativeRuntimeCoreStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_networkInfoJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_networkInfoValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_nodeInfoJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_nodeInfoValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_nodePubkeyJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_nodePubkeyValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_openChannelJson: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_openChannelJsonWithOptions: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint, j: number, k: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_openChannelValue: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint) => [number, number, number];
    readonly rlnwasmsdknodehandle_openChannelValueWithOptions: (a: number, b: number, c: number, d: bigint, e: number, f: number, g: number, h: number, i: bigint, j: number, k: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_processNativeRuntimeQueueJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_processNativeRuntimeQueueValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_reconnectManagerOnResume: (a: number) => void;
    readonly rlnwasmsdknodehandle_reconnectManagerStartJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_reconnectManagerStartValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_reconnectManagerStatusJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_reconnectManagerStatusValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_reconnectManagerStopJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_reconnectManagerStopValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_reconnectPersistedPeersJson: (a: number) => any;
    readonly rlnwasmsdknodehandle_reconnectPersistedPeersValue: (a: number) => any;
    readonly rlnwasmsdknodehandle_relaySessionAuthJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_relaySessionAuthValue: (a: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_sendPaymentJson: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: bigint) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_sendPaymentValue: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number, h: number, i: bigint) => [number, number, number];
    readonly rlnwasmsdknodehandle_setEnableVirtualChannelsV0: (a: number, b: number) => void;
    readonly rlnwasmsdknodehandle_setRelaySessionAuth: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly rlnwasmsdknodehandle_signMessageJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_signMessageValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_submitFundingTransactionJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_submitFundingTransactionValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmsdknodehandle_updatePaymentStatus: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_updatePaymentStatusByInvoice: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly rlnwasmsdknodehandle_updatePaymentStatusByInvoiceJson: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly rlnwasmsdknodehandle_updatePaymentStatusJson: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_blindReceiveJson: (a: number, b: number, c: number, d: any, e: number, f: any, g: number) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_blindReceiveValue: (a: number, b: number, c: number, d: any, e: number, f: any, g: number) => [number, number, number];
    readonly rlnwasmsdkwallethandle_clearRgbProxyTransport: (a: number) => [number, number];
    readonly rlnwasmsdkwallethandle_getAddress: (a: number) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_getAssetMediaJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_getAssetMediaValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdkwallethandle_getBtcBalanceJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_getBtcBalanceValue: (a: number) => [number, number, number];
    readonly rlnwasmsdkwallethandle_getFeeEstimation: (a: number, b: any, c: number) => any;
    readonly rlnwasmsdkwallethandle_getFeeEstimationJson: (a: number, b: any, c: number) => any;
    readonly rlnwasmsdkwallethandle_goOnlineJson: (a: number, b: number, c: number, d: number) => any;
    readonly rlnwasmsdkwallethandle_goOnlineValue: (a: number, b: number, c: number, d: number) => any;
    readonly rlnwasmsdkwallethandle_issueAssetUdaJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_issueAssetUdaValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmsdkwallethandle_listAssetsJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_listAssetsValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmsdkwallethandle_listTransactionsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_listTransactionsValue: (a: number) => [number, number, number];
    readonly rlnwasmsdkwallethandle_refreshValue: (a: number, b: any, c: number, d: number, e: any, f: number) => any;
    readonly rlnwasmsdkwallethandle_rgbProxyTransportJson: (a: number) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_rgbProxyTransportValue: (a: number) => [number, number, number];
    readonly rlnwasmsdkwallethandle_sendBtcBegin: (a: number, b: any, c: number, d: number, e: bigint, f: bigint, g: number) => any;
    readonly rlnwasmsdkwallethandle_sendRgbFromGroupsJson: (a: number, b: any) => any;
    readonly rlnwasmsdkwallethandle_sendRgbFromGroupsValue: (a: number, b: any) => any;
    readonly rlnwasmsdkwallethandle_setRgbProxyTransport: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly rlnwasmsdkwallethandle_signPsbtJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdkwallethandle_syncOnline: (a: number, b: any) => any;
    readonly rlnwasmwallet_backup: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmwallet_backupInfo: (a: number) => [number, number, number];
    readonly rlnwasmwallet_backupInfoJson: (a: number) => [number, number, number, number];
    readonly rlnwasmwallet_blindReceiveJson: (a: number, b: number, c: number, d: any, e: number, f: any, g: number) => [number, number, number, number];
    readonly rlnwasmwallet_blindReceiveValue: (a: number, b: number, c: number, d: any, e: number, f: any, g: number) => [number, number, number];
    readonly rlnwasmwallet_buildLightningFundingTxJson: (a: number, b: any, c: number, d: number, e: bigint, f: bigint) => any;
    readonly rlnwasmwallet_buildLightningFundingTxValue: (a: number, b: any, c: number, d: number, e: bigint, f: bigint) => any;
    readonly rlnwasmwallet_clearRgbProxyTransport: (a: number) => [number, number];
    readonly rlnwasmwallet_configureVssBackup: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly rlnwasmwallet_create: (a: number, b: number) => any;
    readonly rlnwasmwallet_createUtxosBegin: (a: number, b: any, c: number, d: number, e: number, f: bigint, g: number) => any;
    readonly rlnwasmwallet_createUtxosEnd: (a: number, b: any, c: number, d: number, e: number) => any;
    readonly rlnwasmwallet_createUtxosEndJson: (a: number, b: any, c: number, d: number, e: number) => any;
    readonly rlnwasmwallet_disableVssBackup: (a: number) => [number, number];
    readonly rlnwasmwallet_drainToBegin: (a: number, b: any, c: number, d: number, e: number, f: bigint) => any;
    readonly rlnwasmwallet_drainToEnd: (a: number, b: any, c: number, d: number) => any;
    readonly rlnwasmwallet_failTransfers: (a: number, b: any, c: number, d: number, e: number) => any;
    readonly rlnwasmwallet_failTransfersJson: (a: number, b: any, c: number, d: number, e: number) => any;
    readonly rlnwasmwallet_getAddress: (a: number) => [number, number, number, number];
    readonly rlnwasmwallet_getAssetBalanceJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmwallet_getAssetBalanceValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmwallet_getAssetMediaJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmwallet_getAssetMediaValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmwallet_getAssetMetadataJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmwallet_getAssetMetadataValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmwallet_getBtcBalanceJson: (a: number) => [number, number, number, number];
    readonly rlnwasmwallet_getBtcBalanceValue: (a: number) => [number, number, number];
    readonly rlnwasmwallet_getFeeEstimation: (a: number, b: any, c: number) => any;
    readonly rlnwasmwallet_getFeeEstimationJson: (a: number, b: any, c: number) => any;
    readonly rlnwasmwallet_getWalletDataJson: (a: number) => [number, number, number, number];
    readonly rlnwasmwallet_getWalletDataValue: (a: number) => [number, number, number];
    readonly rlnwasmwallet_goOnlineJson: (a: number, b: number, c: number, d: number) => any;
    readonly rlnwasmwallet_goOnlineValue: (a: number, b: number, c: number, d: number) => any;
    readonly rlnwasmwallet_inflateBegin: (a: number, b: any, c: number, d: number, e: any, f: bigint, g: number) => any;
    readonly rlnwasmwallet_inflateEndJson: (a: number, b: any, c: number, d: number) => any;
    readonly rlnwasmwallet_inflateEndValue: (a: number, b: any, c: number, d: number) => any;
    readonly rlnwasmwallet_issueAssetUdaJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmwallet_issueAssetUdaValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmwallet_listAssetsJson: (a: number, b: any) => [number, number, number, number];
    readonly rlnwasmwallet_listAssetsValue: (a: number, b: any) => [number, number, number];
    readonly rlnwasmwallet_listTransactionsJson: (a: number) => [number, number, number, number];
    readonly rlnwasmwallet_listTransactionsValue: (a: number) => [number, number, number];
    readonly rlnwasmwallet_listTransfersJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmwallet_listTransfersValue: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmwallet_listUnspentsJson: (a: number, b: number) => [number, number, number, number];
    readonly rlnwasmwallet_listUnspentsValue: (a: number, b: number) => [number, number, number];
    readonly rlnwasmwallet_listUnspentsVanillaJson: (a: number, b: any, c: number, d: number) => any;
    readonly rlnwasmwallet_listUnspentsVanillaValue: (a: number, b: any, c: number, d: number) => any;
    readonly rlnwasmwallet_new: (a: number, b: number) => [number, number, number];
    readonly rlnwasmwallet_refreshJson: (a: number, b: any, c: number, d: number, e: any, f: number) => any;
    readonly rlnwasmwallet_refreshValue: (a: number, b: any, c: number, d: number, e: any, f: number) => any;
    readonly rlnwasmwallet_restoreBackup: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly rlnwasmwallet_rgbProxyTransportJson: (a: number) => [number, number, number, number];
    readonly rlnwasmwallet_rgbProxyTransportValue: (a: number) => [number, number, number];
    readonly rlnwasmwallet_sendBegin: (a: number, b: any, c: any, d: number, e: bigint, f: number) => any;
    readonly rlnwasmwallet_sendBtcBegin: (a: number, b: any, c: number, d: number, e: bigint, f: bigint, g: number) => any;
    readonly rlnwasmwallet_sendBtcEnd: (a: number, b: any, c: number, d: number, e: number) => any;
    readonly rlnwasmwallet_sendEndJson: (a: number, b: any, c: number, d: number, e: number) => any;
    readonly rlnwasmwallet_sendEndValue: (a: number, b: any, c: number, d: number, e: number) => any;
    readonly rlnwasmwallet_sendRgbFromGroupsJson: (a: number, b: any) => any;
    readonly rlnwasmwallet_sendRgbFromGroupsValue: (a: number, b: any) => any;
    readonly rlnwasmwallet_setRgbProxyTransport: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly rlnwasmwallet_signPsbtJson: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmwallet_syncOnline: (a: number, b: any) => any;
    readonly rlnwasmwallet_vssBackupInfoJson: (a: number) => any;
    readonly rlnwasmwallet_vssBackupInfoValue: (a: number) => any;
    readonly rlnwasmwallet_vssBackupJson: (a: number) => any;
    readonly rlnwasmwallet_vssBackupValue: (a: number) => any;
    readonly rlnwasmwallet_vssRestoreBackup: (a: number) => any;
    readonly rlnwasmwallet_witnessReceiveJson: (a: number, b: number, c: number, d: any, e: number, f: any, g: number) => [number, number, number, number];
    readonly rlnwasmwallet_witnessReceiveValue: (a: number, b: number, c: number, d: any, e: number, f: any, g: number) => [number, number, number];
    readonly rlnwasmsdk_newWallet: (a: number, b: number, c: number) => [number, number, number];
    readonly rlnwasmsdkwallethandle_signPsbtValue: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmwallet_signPsbtValue: (a: number, b: number, c: number) => [number, number, number, number];
    readonly rlnwasmsdk_walletSignPsbtValue: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly rlnwasmsdk_new: () => number;
    readonly wasm_init: () => void;
    readonly rustsecp256k1_v0_10_0_default_error_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_default_illegal_callback_fn: (a: number, b: number) => void;
    readonly rustsecp256k1_v0_10_0_context_create: (a: number) => number;
    readonly rustsecp256k1_v0_10_0_context_destroy: (a: number) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___wasm_bindgen_ad9ab61505cf9ad2___JsValue__core_d941ad8722425d2e___result__Result_____wasm_bindgen_ad9ab61505cf9ad2___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___wasm_bindgen_ad9ab61505cf9ad2___JsValue______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true__3: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_Event__Event______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_IdbVersionChangeEvent__IdbVersionChangeEvent______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true__6: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true_: (a: number, b: number) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true__1_: (a: number, b: number) => void;
    readonly wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true__2_: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
