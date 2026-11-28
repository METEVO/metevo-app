/* @ts-self-types="./rln_wasm_sdk.d.ts" */
import { __rln_vss_acquire_lock, __rln_vss_release_lock } from './snippets/rln-wasm-sdk-a6a7423038354311/inline0.js';
import { __rln_runtime_idb_delete, __rln_runtime_idb_set } from './snippets/rln-wasm-sdk-a6a7423038354311/inline1.js';

export class RlnWasmInvoice {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmInvoiceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasminvoice_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    invoiceDataJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasminvoice_invoiceDataJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    invoiceDataValue() {
        const ret = wasm.rlnwasminvoice_invoiceDataValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    invoiceString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.rlnwasminvoice_invoiceString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} invoice_string
     */
    constructor(invoice_string) {
        const ptr0 = passStringToWasm0(invoice_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasminvoice_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        RlnWasmInvoiceFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) RlnWasmInvoice.prototype[Symbol.dispose] = RlnWasmInvoice.prototype.free;

export class RlnWasmLnSocket {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RlnWasmLnSocket.prototype);
        obj.__wbg_ptr = ptr;
        RlnWasmLnSocketFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmLnSocketFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasmlnsocket_free(ptr, 0);
    }
    /**
     * @returns {Promise<void>}
     */
    close() {
        const ret = wasm.rlnwasmlnsocket_close(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    isClosed() {
        const ret = wasm.rlnwasmlnsocket_isClosed(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {bigint}
     */
    lastInboundSeqValue() {
        const ret = wasm.rlnwasmlnsocket_lastInboundSeqValue(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {string} payload_hex
     * @returns {Promise<void>}
     */
    sendHex(payload_hex) {
        const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmlnsocket_sendHex(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {Function} on_message
     */
    startReadLoop(on_message) {
        const ret = wasm.rlnwasmlnsocket_startReadLoop(this.__wbg_ptr, on_message);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    stopReadLoop() {
        wasm.rlnwasmlnsocket_stopReadLoop(this.__wbg_ptr);
    }
    /**
     * @returns {string}
     */
    websocketUrl() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.rlnwasmlnsocket_websocketUrl(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) RlnWasmLnSocket.prototype[Symbol.dispose] = RlnWasmLnSocket.prototype.free;

export class RlnWasmNode {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RlnWasmNode.prototype);
        obj.__wbg_ptr = ptr;
        RlnWasmNodeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmNodeFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasmnode_free(ptr, 0);
    }
    /**
     * @param {string} host_node_id
     * @returns {Promise<string>}
     */
    apayNewJson(host_node_id) {
        const ptr0 = passStringToWasm0(host_node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_apayNewJson(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Async payments with LSP: register a fresh batch of payment hashes with the invoice-host /
     * LSP peer (`async_order.new`). Returns the host's order acknowledgement. Mirrors the native
     * SDK's `apay_new` / `/apay/new`.
     * @param {string} host_node_id
     * @returns {Promise<any>}
     */
    apayNewValue(host_node_id) {
        const ptr0 = passStringToWasm0(host_node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_apayNewValue(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} host_node_id
     * @param {string} username
     * @param {string} domain
     * @returns {Promise<string>}
     */
    apayNewWithAddressJson(host_node_id, username, domain) {
        const ptr0 = passStringToWasm0(host_node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(username, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(domain, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_apayNewWithAddressJson(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
    /**
     * Like [`Self::apay_new_value`] but also attests a `username@domain` Lightning Address so the
     * LSP can serve inbound payments to that address. Mirrors `apay_new_with_address`.
     * @param {string} host_node_id
     * @param {string} username
     * @param {string} domain
     * @returns {Promise<any>}
     */
    apayNewWithAddressValue(host_node_id, username, domain) {
        const ptr0 = passStringToWasm0(host_node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(username, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(domain, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_apayNewWithAddressValue(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
    /**
     * @param {RlnWasmWallet} wallet
     */
    attachWallet(wallet) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmnode_attachWallet(this.__wbg_ptr, wallet.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {number} interval_ms
     * @returns {string}
     */
    autoDriveStartJson(interval_ms) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_autoDriveStartJson(this.__wbg_ptr, interval_ms);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Start the autonomous drive loop: a self-scheduling timer that runs `node_drive_tick_once`
     * (chain sync → live LDK → event draining → authoritative channel reconcile) every
     * `interval_ms` (clamped to a sane minimum; `0` selects the default cadence). This lets apps
     * receive invoices / progress channels / settle HTLCs without hand-driving `chainSyncTick`,
     * mirroring the native daemon's background processor (PARITY_PLAN 0.2). Idempotent: calling it
     * while already running just returns the current status.
     * @param {number} interval_ms
     * @returns {any}
     */
    autoDriveStartValue(interval_ms) {
        const ret = wasm.rlnwasmnode_autoDriveStartValue(this.__wbg_ptr, interval_ms);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    autoDriveStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_autoDriveStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    autoDriveStatusValue() {
        const ret = wasm.rlnwasmnode_autoDriveStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    autoDriveStopJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_autoDriveStopJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    autoDriveStopValue() {
        const ret = wasm.rlnwasmnode_autoDriveStopValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} payment_hash
     * @returns {string}
     */
    cancelHodlInvoiceJson(payment_hash) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_cancelHodlInvoiceJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payment_hash
     * @returns {any}
     */
    cancelHodlInvoiceValue(payment_hash) {
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_cancelHodlInvoiceValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} txid
     * @param {string} tx_hex
     */
    chainSyncEnqueueRebroadcastTx(txid, tx_hex) {
        const ptr0 = passStringToWasm0(txid, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(tx_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_chainSyncEnqueueRebroadcastTx(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} indexer_url
     * @param {number | null} [poll_interval_ms]
     * @returns {string}
     */
    chainSyncStartJson(indexer_url, poll_interval_ms) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_chainSyncStartJson(this.__wbg_ptr, ptr0, len0, isLikeNone(poll_interval_ms) ? 0x100000001 : (poll_interval_ms) >>> 0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} indexer_url
     * @param {number | null} [poll_interval_ms]
     * @returns {any}
     */
    chainSyncStartValue(indexer_url, poll_interval_ms) {
        const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_chainSyncStartValue(this.__wbg_ptr, ptr0, len0, isLikeNone(poll_interval_ms) ? 0x100000001 : (poll_interval_ms) >>> 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    chainSyncStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_chainSyncStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    chainSyncStatusValue() {
        const ret = wasm.rlnwasmnode_chainSyncStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    chainSyncStopJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_chainSyncStopJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    chainSyncStopValue() {
        const ret = wasm.rlnwasmnode_chainSyncStopValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {Promise<string>}
     */
    chainSyncTickJson() {
        const ret = wasm.rlnwasmnode_chainSyncTickJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    chainSyncTickValue() {
        const ret = wasm.rlnwasmnode_chainSyncTickValue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} payment_hash
     * @param {string} payment_preimage
     * @returns {string}
     */
    claimHodlInvoiceJson(payment_hash, payment_preimage) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(payment_preimage, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_claimHodlInvoiceJson(this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} payment_hash
     * @param {string} payment_preimage
     * @returns {any}
     */
    claimHodlInvoiceValue(payment_hash, payment_preimage) {
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(payment_preimage, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_claimHodlInvoiceValue(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    clearAutoPeerManagerHooks() {
        wasm.rlnwasmnode_clearAutoPeerManagerHooks(this.__wbg_ptr);
    }
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
     * @param {string} server_url
     * @param {string} store_id
     * @param {string} signing_key_hex
     * @returns {Promise<void>}
     */
    clearLdkVssFence(server_url, store_id, signing_key_hex) {
        const ptr0 = passStringToWasm0(server_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(store_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(signing_key_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_clearLdkVssFence(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
    /**
     * @returns {Promise<void>}
     */
    closeAllPeers() {
        const ret = wasm.rlnwasmnode_closeAllPeers(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} channel_id
     */
    closeChannel(channel_id) {
        const ptr0 = passStringToWasm0(channel_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_closeChannel(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} channel_id
     * @param {string | null | undefined} peer_pubkey
     * @param {boolean} force
     */
    closeChannelWithOptions(channel_id, peer_pubkey, force) {
        const ptr0 = passStringToWasm0(channel_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(peer_pubkey) ? 0 : passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_closeChannelWithOptions(this.__wbg_ptr, ptr0, len0, ptr1, len1, force);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {string} server_url
     * @param {string} store_id
     * @param {string} signing_key_hex
     * @returns {Promise<number>}
     */
    configureLdkVssReplication(server_url, store_id, signing_key_hex) {
        const ptr0 = passStringToWasm0(server_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(store_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(signing_key_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_configureLdkVssReplication(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
    /**
     * @param {string} peer_addr
     * @param {string} peer_pubkey
     * @returns {Promise<void>}
     */
    connectPeer(peer_addr, peer_pubkey) {
        const ptr0 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_connectPeer(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null | undefined} asset_id
     * @param {bigint | null | undefined} asset_amount
     * @param {string} payment_hash
     * @returns {string}
     */
    createHodlLnInvoiceJson(amt_msat, expiry_sec, asset_id, asset_amount, payment_hash) {
        let deferred4_0;
        let deferred4_1;
        try {
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_createHodlLnInvoiceJson(this.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null | undefined} asset_id
     * @param {bigint | null | undefined} asset_amount
     * @param {string} payment_hash
     * @returns {any}
     */
    createHodlLnInvoiceValue(amt_msat, expiry_sec, asset_id, asset_amount, payment_hash) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_createHodlLnInvoiceValue(this.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    createLnInvoiceJson(amt_msat, expiry_sec, asset_id, asset_amount) {
        let deferred3_0;
        let deferred3_1;
        try {
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_createLnInvoiceJson(this.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    createLnInvoiceLiveJson(amt_msat, expiry_sec, asset_id, asset_amount) {
        let deferred3_0;
        let deferred3_1;
        try {
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_createLnInvoiceLiveJson(this.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * Create a BOLT11 invoice registered with the real live `ChannelManager`.
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    createLnInvoiceLiveValue(amt_msat, expiry_sec, asset_id, asset_amount) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_createLnInvoiceLiveValue(this.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    createLnInvoiceValue(amt_msat, expiry_sec, asset_id, asset_amount) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_createLnInvoiceValue(this.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @returns {string}
     */
    decodeLnInvoiceJson(invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_decodeLnInvoiceJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @returns {any}
     */
    decodeLnInvoiceValue(invoice) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_decodeLnInvoiceValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @returns {string}
     */
    decodeRgbInvoiceJson(invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_decodeRgbInvoiceJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @returns {any}
     */
    decodeRgbInvoiceValue(invoice) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_decodeRgbInvoiceValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Disable VSS replication for this node (unregisters the replicator; queued
     * writes are dropped). Releases both the single-writer guards — the VSS fence
     * (best-effort, async) and the same-origin Web Lock — so another instance can
     * take over cleanly. Local persistence is unaffected.
     */
    disableLdkVssReplication() {
        wasm.rlnwasmnode_disableLdkVssReplication(this.__wbg_ptr);
    }
    /**
     * @param {string} peer_pubkey
     * @returns {Promise<void>}
     */
    disconnectPeer(peer_pubkey) {
        const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_disconnectPeer(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @returns {string}
     */
    drainNativeRuntimeQueueJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_drainNativeRuntimeQueueJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    drainNativeRuntimeQueueValue() {
        const ret = wasm.rlnwasmnode_drainNativeRuntimeQueueValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {Promise<void>}
     */
    driveRgbFundingWork() {
        const ret = wasm.rlnwasmnode_driveRgbFundingWork(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    enableVirtualChannelsV0Json() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_enableVirtualChannelsV0Json(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    enableVirtualChannelsV0Value() {
        const ret = wasm.rlnwasmnode_enableVirtualChannelsV0Value(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {any}
     */
    failPendingPayments() {
        const ret = wasm.rlnwasmnode_failPendingPayments(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} temporary_channel_id
     * @returns {string}
     */
    getChannelId(temporary_channel_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(temporary_channel_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_getChannelId(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payment_hash
     * @returns {string}
     */
    getPaymentJson(payment_hash) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_getPaymentJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payment_hash
     * @returns {any}
     */
    getPaymentValue(payment_hash) {
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_getPaymentValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} payload_hex
     * @returns {any}
     */
    ingestReadEventPayloadHex(payload_hex) {
        const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_ingestReadEventPayloadHex(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} payload_hex
     * @returns {string}
     */
    ingestReadEventPayloadHexJson(payload_hex) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_ingestReadEventPayloadHexJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payload_hex
     * @returns {string}
     */
    ingestRuntimeTransportEventPayloadHexJson(payload_hex) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_ingestRuntimeTransportEventPayloadHexJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payload_hex
     * @returns {any}
     */
    ingestRuntimeTransportEventPayloadHexValue(payload_hex) {
        const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_ingestRuntimeTransportEventPayloadHexValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    installAutoPeerManagerHooks() {
        wasm.rlnwasmnode_installAutoPeerManagerHooks(this.__wbg_ptr);
    }
    /**
     * @param {string} invoice
     * @returns {string}
     */
    invoiceStatusJson(invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_invoiceStatusJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @returns {any}
     */
    invoiceStatusValue(invoice) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_invoiceStatusValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetCfaJson(request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_issueAssetCfaJson(this.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetCfaValue(request_js) {
        const ret = wasm.rlnwasmnode_issueAssetCfaValue(this.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetIfaJson(request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_issueAssetIfaJson(this.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetIfaValue(request_js) {
        const ret = wasm.rlnwasmnode_issueAssetIfaValue(this.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetNiaJson(request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_issueAssetNiaJson(this.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetNiaValue(request_js) {
        const ret = wasm.rlnwasmnode_issueAssetNiaValue(this.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} dest_pubkey
     * @param {bigint} amt_msat
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    keysendJson(dest_pubkey, amt_msat, asset_id, asset_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(dest_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_keysendJson(this.__wbg_ptr, ptr0, len0, amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} dest_pubkey
     * @param {bigint} amt_msat
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    keysendLiveJson(dest_pubkey, amt_msat, asset_id, asset_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(dest_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_keysendLiveJson(this.__wbg_ptr, ptr0, len0, amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * Send a REAL keysend (spontaneous) HTLC over a live channel via the wasm `ChannelManager`.
     *
     * Unlike [`keysend_value`], which records a parity-model payment that settles from the
     * event-stream, this constructs and routes an actual HTLC to `dest_pubkey` over the wire. The
     * returned record starts `pending`; poll [`live_payment_value`] until it becomes `succeeded`
     * (driven by a real `PaymentSent` event). Pass `asset_id`/`asset_amount` to ride RGB on it.
     * @param {string} dest_pubkey
     * @param {bigint} amt_msat
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    keysendLiveValue(dest_pubkey, amt_msat, asset_id, asset_amount) {
        const ptr0 = passStringToWasm0(dest_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_keysendLiveValue(this.__wbg_ptr, ptr0, len0, amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} dest_pubkey
     * @param {bigint} amt_msat
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    keysendValue(dest_pubkey, amt_msat, asset_id, asset_amount) {
        const ptr0 = passStringToWasm0(dest_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_keysendValue(this.__wbg_ptr, ptr0, len0, amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    ldkRuntimeComponentsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_ldkRuntimeComponentsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    ldkRuntimeComponentsValue() {
        const ret = wasm.rlnwasmnode_ldkRuntimeComponentsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    ldkRuntimeStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_ldkRuntimeStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    ldkRuntimeStatusValue() {
        const ret = wasm.rlnwasmnode_ldkRuntimeStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Health view for LDK VSS replication as JSON:
     * `{ configured, pendingWrites, lastError }`. `pendingWrites > 0` means some
     * state has not yet reached VSS (transient outage); alert if it stays non-zero.
     * @returns {string}
     */
    ldkVssBackupInfoJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_ldkVssBackupInfoJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    listChannelsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_listChannelsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listChannelsValue() {
        const ret = wasm.rlnwasmnode_listChannelsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listPaymentsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_listPaymentsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listPaymentsValue() {
        const ret = wasm.rlnwasmnode_listPaymentsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listPeersJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_listPeersJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listPeersValue() {
        const ret = wasm.rlnwasmnode_listPeersValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listPendingFundingRequestsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_listPendingFundingRequestsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listPendingFundingRequestsValue() {
        const ret = wasm.rlnwasmnode_listPendingFundingRequestsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listRgbLnTransfersJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_listRgbLnTransfersJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listRgbLnTransfersValue() {
        const ret = wasm.rlnwasmnode_listRgbLnTransfersValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listRuntimeEventsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_listRuntimeEventsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listRuntimeEventsValue() {
        const ret = wasm.rlnwasmnode_listRuntimeEventsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Status of a single REAL payment by hex payment hash (from the live event stream), or null.
     * @param {string} payment_hash
     * @returns {any}
     */
    livePaymentValue(payment_hash) {
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_livePaymentValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Snapshot of all REAL payments tracked from the live `ChannelManager` event stream.
     * @returns {any}
     */
    livePaymentsValue() {
        const ret = wasm.rlnwasmnode_livePaymentsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    nativeRuntimeCoreStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_nativeRuntimeCoreStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    nativeRuntimeCoreStatusValue() {
        const ret = wasm.rlnwasmnode_nativeRuntimeCoreStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    networkInfoJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_networkInfoJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    networkInfoValue() {
        const ret = wasm.rlnwasmnode_networkInfoValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Bare constructor. The network is left unset and adopted from the first attached wallet
     * (regtest defaults apply until then). For an explicit, native-style network selection use
     * [`new_with_node_runtime_id`](Self::new_with_node_runtime_id).
     * @param {string} proxy_url
     */
    constructor(proxy_url) {
        const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        RlnWasmNodeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Construct a node with an explicit Bitcoin network, mirroring the native node's `--network`.
     * The `network` string is one of `"mainnet" | "testnet" | "testnet4" | "signet" | "regtest"`
     * (case-insensitive). The node owns this network as its single source of truth: it drives the
     * LDK `ChannelManager`/`NetworkGraph` (and therefore the `Init` handshake chain), and
     * `attachWallet` will reject a wallet created on a different network.
     * @param {string} proxy_url
     * @param {string} node_runtime_id
     * @param {string} network
     * @returns {RlnWasmNode}
     */
    static newWithNodeRuntimeId(proxy_url, node_runtime_id, network) {
        const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(node_runtime_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_newWithNodeRuntimeId(ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RlnWasmNode.__wrap(ret[0]);
    }
    /**
     * @returns {string}
     */
    nodeInfoJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_nodeInfoJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    nodeInfoValue() {
        const ret = wasm.rlnwasmnode_nodeInfoValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    nodePubkeyJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_nodePubkeyJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    nodePubkeyValue() {
        const ret = wasm.rlnwasmnode_nodePubkeyValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @returns {string}
     */
    openChannelJson(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_openChannelJson(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @param {string | null} [virtual_open_mode]
     * @returns {string}
     */
    openChannelJsonWithOptions(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount, virtual_open_mode) {
        let deferred5_0;
        let deferred5_1;
        try {
            const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            var ptr2 = isLikeNone(virtual_open_mode) ? 0 : passStringToWasm0(virtual_open_mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len2 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_openChannelJsonWithOptions(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount, ptr2, len2);
            var ptr4 = ret[0];
            var len4 = ret[1];
            if (ret[3]) {
                ptr4 = 0; len4 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string} asset_id
     * @param {bigint} asset_local_amount
     * @param {string} contract_id
     * @param {string} consignment_endpoint
     * @returns {string}
     */
    openChannelRgbJson(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount, contract_id, consignment_endpoint) {
        let deferred6_0;
        let deferred6_1;
        try {
            const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passStringToWasm0(contract_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len2 = WASM_VECTOR_LEN;
            const ptr3 = passStringToWasm0(consignment_endpoint, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len3 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_openChannelRgbJson(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, asset_local_amount, ptr2, len2, ptr3, len3);
            var ptr5 = ret[0];
            var len5 = ret[1];
            if (ret[3]) {
                ptr5 = 0; len5 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred6_0 = ptr5;
            deferred6_1 = len5;
            return getStringFromWasm0(ptr5, len5);
        } finally {
            wasm.__wbindgen_free(deferred6_0, deferred6_1, 1);
        }
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @returns {any}
     */
    openChannelValue(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount) {
        const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_openChannelValue(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @param {string | null} [virtual_open_mode]
     * @param {string | null} [contract_id]
     * @param {string | null} [consignment_endpoint]
     * @returns {any}
     */
    openChannelValueWithOptions(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount, virtual_open_mode, contract_id, consignment_endpoint) {
        const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(virtual_open_mode) ? 0 : passStringToWasm0(virtual_open_mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        var ptr3 = isLikeNone(contract_id) ? 0 : passStringToWasm0(contract_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len3 = WASM_VECTOR_LEN;
        var ptr4 = isLikeNone(consignment_endpoint) ? 0 : passStringToWasm0(consignment_endpoint, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len4 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_openChannelValueWithOptions(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount, ptr2, len2, ptr3, len3, ptr4, len4);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    peerEngineStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_peerEngineStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    peerEngineStatusValue() {
        const ret = wasm.rlnwasmnode_peerEngineStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    persistLdkRuntimeState() {
        const ret = wasm.rlnwasmnode_persistLdkRuntimeState(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {string}
     */
    processNativeRuntimeQueueJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_processNativeRuntimeQueueJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    processNativeRuntimeQueueValue() {
        const ret = wasm.rlnwasmnode_processNativeRuntimeQueueValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {Promise<void>}
     */
    processPendingRgbTransactions() {
        const ret = wasm.rlnwasmnode_processPendingRgbTransactions(this.__wbg_ptr);
        return ret;
    }
    reconnectManagerOnResume() {
        wasm.rlnwasmnode_reconnectManagerOnResume(this.__wbg_ptr);
    }
    /**
     * @returns {string}
     */
    reconnectManagerStartJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_reconnectManagerStartJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    reconnectManagerStartValue() {
        const ret = wasm.rlnwasmnode_reconnectManagerStartValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    reconnectManagerStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_reconnectManagerStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    reconnectManagerStatusValue() {
        const ret = wasm.rlnwasmnode_reconnectManagerStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    reconnectManagerStopJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_reconnectManagerStopJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    reconnectManagerStopValue() {
        const ret = wasm.rlnwasmnode_reconnectManagerStopValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {Promise<string>}
     */
    reconnectPersistedPeersJson() {
        const ret = wasm.rlnwasmnode_reconnectPersistedPeersJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    reconnectPersistedPeersValue() {
        const ret = wasm.rlnwasmnode_reconnectPersistedPeersValue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    relaySessionAuthJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_relaySessionAuthJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    relaySessionAuthValue() {
        const ret = wasm.rlnwasmnode_relaySessionAuthValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @param {bigint | null} [amt_msat]
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    sendPaymentJson(invoice, amt_msat, asset_id, asset_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_sendPaymentJson(this.__wbg_ptr, ptr0, len0, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @param {bigint | null} [amt_msat]
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    sendPaymentLiveJson(invoice, amt_msat, asset_id, asset_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_sendPaymentLiveJson(this.__wbg_ptr, ptr0, len0, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * Pay a BOLT11 invoice using the real live `ChannelManager`.
     * @param {string} invoice
     * @param {bigint | null} [amt_msat]
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    sendPaymentLiveValue(invoice, amt_msat, asset_id, asset_amount) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_sendPaymentLiveValue(this.__wbg_ptr, ptr0, len0, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @param {bigint | null} [amt_msat]
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    sendPaymentValue(invoice, amt_msat, asset_id, asset_amount) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_sendPaymentValue(this.__wbg_ptr, ptr0, len0, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {boolean} enabled
     */
    setEnableVirtualChannelsV0(enabled) {
        wasm.rlnwasmnode_setEnableVirtualChannelsV0(this.__wbg_ptr, enabled);
    }
    /**
     * @param {string | null} [relay_auth_token]
     * @param {string | null} [relay_node_id]
     */
    setRelaySessionAuth(relay_auth_token, relay_node_id) {
        var ptr0 = isLikeNone(relay_auth_token) ? 0 : passStringToWasm0(relay_auth_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(relay_node_id) ? 0 : passStringToWasm0(relay_node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_setRelaySessionAuth(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} message
     * @returns {string}
     */
    signMessageJson(message) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_signMessageJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} message
     * @returns {any}
     */
    signMessageValue(message) {
        const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_signMessageValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} submission_js
     * @returns {string}
     */
    submitFundingTransactionJson(submission_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmnode_submitFundingTransactionJson(this.__wbg_ptr, submission_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} submission_js
     * @returns {any}
     */
    submitFundingTransactionValue(submission_js) {
        const ret = wasm.rlnwasmnode_submitFundingTransactionValue(this.__wbg_ptr, submission_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} payment_hash
     * @param {string} status
     * @returns {any}
     */
    updatePaymentStatus(payment_hash, status) {
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_updatePaymentStatus(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @param {string} status
     * @returns {any}
     */
    updatePaymentStatusByInvoice(invoice, status) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmnode_updatePaymentStatusByInvoice(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @param {string} status
     * @returns {string}
     */
    updatePaymentStatusByInvoiceJson(invoice, status) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_updatePaymentStatusByInvoiceJson(this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} payment_hash
     * @param {string} status
     * @returns {string}
     */
    updatePaymentStatusJson(payment_hash, status) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmnode_updatePaymentStatusJson(this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
}
if (Symbol.dispose) RlnWasmNode.prototype[Symbol.dispose] = RlnWasmNode.prototype.free;

export class RlnWasmPeerSession {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RlnWasmPeerSession.prototype);
        obj.__wbg_ptr = ptr;
        RlnWasmPeerSessionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmPeerSessionFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasmpeersession_free(ptr, 0);
    }
    /**
     * @returns {Promise<void>}
     */
    close() {
        const ret = wasm.rlnwasmpeersession_close(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    isStarted() {
        const ret = wasm.rlnwasmpeersession_isStarted(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Promise<void>}
     */
    start() {
        const ret = wasm.rlnwasmpeersession_start(this.__wbg_ptr);
        return ret;
    }
    stop() {
        wasm.rlnwasmpeersession_stop(this.__wbg_ptr);
    }
    /**
     * @returns {string}
     */
    websocketUrl() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.rlnwasmpeersession_websocketUrl(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) RlnWasmPeerSession.prototype[Symbol.dispose] = RlnWasmPeerSession.prototype.free;

export class RlnWasmRustPeerManagerBridge {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmRustPeerManagerBridgeFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasmrustpeermanagerbridge_free(ptr, 0);
    }
    /**
     * @param {string} proxy_url
     * @param {string} peer_addr
     * @param {string} peer_pubkey
     * @returns {Promise<RlnWasmPeerSession>}
     */
    connectSession(proxy_url, peer_addr, peer_pubkey) {
        const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmrustpeermanagerbridge_connectSession(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
    /**
     * @param {string} proxy_url
     * @param {string} peer_addr
     * @param {string} peer_pubkey
     * @param {any} options_js
     * @returns {Promise<RlnWasmPeerSession>}
     */
    connectSessionWithOptions(proxy_url, peer_addr, peer_pubkey, options_js) {
        const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmrustpeermanagerbridge_connectSessionWithOptions(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, options_js);
        return ret;
    }
    /**
     * @param {string | null} [initial_outbound_hex]
     */
    constructor(initial_outbound_hex) {
        var ptr0 = isLikeNone(initial_outbound_hex) ? 0 : passStringToWasm0(initial_outbound_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmrustpeermanagerbridge_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        RlnWasmRustPeerManagerBridgeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} initial_outbound_hex
     */
    setInitialOutboundHex(initial_outbound_hex) {
        const ptr0 = passStringToWasm0(initial_outbound_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmrustpeermanagerbridge_setInitialOutboundHex(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {any}
     */
    statsValue() {
        const ret = wasm.rlnwasmrustpeermanagerbridge_statsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}
if (Symbol.dispose) RlnWasmRustPeerManagerBridge.prototype[Symbol.dispose] = RlnWasmRustPeerManagerBridge.prototype.free;

export class RlnWasmSdk {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmSdkFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasmsdk_free(ptr, 0);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {RlnWasmWallet} wallet
     */
    attachWallet(node, wallet) {
        _assertClass(node, RlnWasmNode);
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_attachWallet(this.__wbg_ptr, node.__wbg_ptr, wallet.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {number} interval_ms
     * @returns {string}
     */
    autoDriveStartJson(node, interval_ms) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_autoDriveStartJson(this.__wbg_ptr, node.__wbg_ptr, interval_ms);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {number} interval_ms
     * @returns {any}
     */
    autoDriveStartValue(node, interval_ms) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_autoDriveStartValue(this.__wbg_ptr, node.__wbg_ptr, interval_ms);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    autoDriveStatusJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_autoDriveStatusJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    autoDriveStatusValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_autoDriveStatusValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    autoDriveStopJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_autoDriveStopJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    autoDriveStopValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_autoDriveStopValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payment_hash
     * @returns {string}
     */
    cancelHodlInvoiceJson(node, payment_hash) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_cancelHodlInvoiceJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payment_hash
     * @returns {any}
     */
    cancelHodlInvoiceValue(node, payment_hash) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_cancelHodlInvoiceValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} txid
     * @param {string} tx_hex
     */
    chainSyncEnqueueRebroadcastTx(node, txid, tx_hex) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(txid, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(tx_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_chainSyncEnqueueRebroadcastTx(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} indexer_url
     * @param {number | null} [poll_interval_ms]
     * @returns {string}
     */
    chainSyncStartJson(node, indexer_url, poll_interval_ms) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_chainSyncStartJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, isLikeNone(poll_interval_ms) ? 0x100000001 : (poll_interval_ms) >>> 0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} indexer_url
     * @param {number | null} [poll_interval_ms]
     * @returns {any}
     */
    chainSyncStartValue(node, indexer_url, poll_interval_ms) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_chainSyncStartValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, isLikeNone(poll_interval_ms) ? 0x100000001 : (poll_interval_ms) >>> 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    chainSyncStatusJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_chainSyncStatusJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    chainSyncStatusValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_chainSyncStatusValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    chainSyncStopJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_chainSyncStopJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    chainSyncStopValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_chainSyncStopValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {Promise<string>}
     */
    chainSyncTickJson(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_chainSyncTickJson(this.__wbg_ptr, node.__wbg_ptr);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {Promise<any>}
     */
    chainSyncTickValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_chainSyncTickValue(this.__wbg_ptr, node.__wbg_ptr);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payment_hash
     * @param {string} payment_preimage
     * @returns {string}
     */
    claimHodlInvoiceJson(node, payment_hash, payment_preimage) {
        let deferred4_0;
        let deferred4_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(payment_preimage, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_claimHodlInvoiceJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payment_hash
     * @param {string} payment_preimage
     * @returns {any}
     */
    claimHodlInvoiceValue(node, payment_hash, payment_preimage) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(payment_preimage, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_claimHodlInvoiceValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     */
    clearAutoPeerManagerHooks(node) {
        _assertClass(node, RlnWasmNode);
        wasm.rlnwasmsdk_clearAutoPeerManagerHooks(this.__wbg_ptr, node.__wbg_ptr);
    }
    clearDefaultRgbProxyTransport() {
        wasm.rlnwasmsdk_clearDefaultRgbProxyTransport(this.__wbg_ptr);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} channel_id
     */
    closeChannel(node, channel_id) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(channel_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_closeChannel(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} peer_addr
     * @param {string} peer_pubkey
     * @returns {Promise<void>}
     */
    connectPeer(node, peer_addr, peer_pubkey) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_connectPeer(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null | undefined} asset_id
     * @param {bigint | null | undefined} asset_amount
     * @param {string} payment_hash
     * @returns {string}
     */
    createHodlLnInvoiceJson(node, amt_msat, expiry_sec, asset_id, asset_amount, payment_hash) {
        let deferred4_0;
        let deferred4_1;
        try {
            _assertClass(node, RlnWasmNode);
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_createHodlLnInvoiceJson(this.__wbg_ptr, node.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null | undefined} asset_id
     * @param {bigint | null | undefined} asset_amount
     * @param {string} payment_hash
     * @returns {any}
     */
    createHodlLnInvoiceValue(node, amt_msat, expiry_sec, asset_id, asset_amount, payment_hash) {
        _assertClass(node, RlnWasmNode);
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_createHodlLnInvoiceValue(this.__wbg_ptr, node.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    createLnInvoiceJson(node, amt_msat, expiry_sec, asset_id, asset_amount) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_createLnInvoiceJson(this.__wbg_ptr, node.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    createLnInvoiceValue(node, amt_msat, expiry_sec, asset_id, asset_amount) {
        _assertClass(node, RlnWasmNode);
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_createLnInvoiceValue(this.__wbg_ptr, node.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} proxy_url
     * @returns {RlnWasmSdkNodeHandle}
     */
    createNodeHandle(proxy_url) {
        const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_createNodeHandle(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RlnWasmSdkNodeHandle.__wrap(ret[0]);
    }
    /**
     * @param {string} proxy_url
     * @param {string} node_runtime_id
     * @returns {RlnWasmSdkNodeHandle}
     */
    createNodeHandleWithRuntimeId(proxy_url, node_runtime_id) {
        const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(node_runtime_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_createNodeHandleWithRuntimeId(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RlnWasmSdkNodeHandle.__wrap(ret[0]);
    }
    /**
     * @param {string} wallet_data_json
     * @returns {Promise<RlnWasmWallet>}
     */
    createWallet(wallet_data_json) {
        const ptr0 = passStringToWasm0(wallet_data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_createWallet(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} wallet_data_json
     * @returns {RlnWasmSdkWalletHandle}
     */
    createWalletHandle(wallet_data_json) {
        const ptr0 = passStringToWasm0(wallet_data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_createWalletHandle(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RlnWasmSdkWalletHandle.__wrap(ret[0]);
    }
    /**
     * @param {string} wallet_data_json
     * @returns {Promise<RlnWasmSdkWalletHandle>}
     */
    createWalletHandleAsync(wallet_data_json) {
        const ptr0 = passStringToWasm0(wallet_data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_createWalletHandleAsync(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @returns {string}
     */
    decodeLnInvoiceJson(node, invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_decodeLnInvoiceJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @returns {any}
     */
    decodeLnInvoiceValue(node, invoice) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_decodeLnInvoiceValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @returns {string}
     */
    decodeRgbInvoiceJson(node, invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_decodeRgbInvoiceJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @returns {any}
     */
    decodeRgbInvoiceValue(node, invoice) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_decodeRgbInvoiceValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    defaultEnableVirtualChannelsV0Json() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdk_defaultEnableVirtualChannelsV0Json(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    defaultEnableVirtualChannelsV0Value() {
        const ret = wasm.rlnwasmsdk_defaultEnableVirtualChannelsV0Value(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    defaultRgbProxyTransportJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdk_defaultRgbProxyTransportJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    defaultRgbProxyTransportValue() {
        const ret = wasm.rlnwasmsdk_defaultRgbProxyTransportValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} peer_pubkey
     * @returns {Promise<void>}
     */
    disconnectPeer(node, peer_pubkey) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_disconnectPeer(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    drainNativeRuntimeQueueJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_drainNativeRuntimeQueueJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    drainNativeRuntimeQueueValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_drainNativeRuntimeQueueValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    enableVirtualChannelsV0Json(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_enableVirtualChannelsV0Json(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    enableVirtualChannelsV0Value(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_enableVirtualChannelsV0Value(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    failPendingPayments(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_failPendingPayments(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} temporary_channel_id
     * @returns {string}
     */
    getChannelId(node, temporary_channel_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(temporary_channel_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_getChannelId(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payment_hash
     * @returns {string}
     */
    getPaymentJson(node, payment_hash) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_getPaymentJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payment_hash
     * @returns {any}
     */
    getPaymentValue(node, payment_hash) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_getPaymentValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} swap_string
     * @returns {Promise<string>}
     */
    getSwapJson(swap_string) {
        const ptr0 = passStringToWasm0(swap_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_getSwapJson(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} swap_string
     * @returns {Promise<any>}
     */
    getSwapValue(swap_string) {
        const ptr0 = passStringToWasm0(swap_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_getSwapValue(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @returns {string}
     */
    healthcheck() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.rlnwasmsdk_healthcheck(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payload_hex
     * @returns {any}
     */
    ingestReadEventPayloadHex(node, payload_hex) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_ingestReadEventPayloadHex(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payload_hex
     * @returns {string}
     */
    ingestReadEventPayloadHexJson(node, payload_hex) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_ingestReadEventPayloadHexJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payload_hex
     * @returns {string}
     */
    ingestRuntimeTransportEventPayloadHexJson(node, payload_hex) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_ingestRuntimeTransportEventPayloadHexJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payload_hex
     * @returns {any}
     */
    ingestRuntimeTransportEventPayloadHexValue(node, payload_hex) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_ingestRuntimeTransportEventPayloadHexValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} password
     * @param {string | null} [mnemonic]
     * @returns {Promise<string>}
     */
    initJson(password, mnemonic) {
        const ptr0 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(mnemonic) ? 0 : passStringToWasm0(mnemonic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_initJson(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @param {string} password
     * @param {string | null} [mnemonic]
     * @returns {Promise<any>}
     */
    initValue(password, mnemonic) {
        const ptr0 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(mnemonic) ? 0 : passStringToWasm0(mnemonic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_initValue(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     */
    installAutoPeerManagerHooks(node) {
        _assertClass(node, RlnWasmNode);
        wasm.rlnwasmsdk_installAutoPeerManagerHooks(this.__wbg_ptr, node.__wbg_ptr);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @returns {string}
     */
    invoiceStatusJson(node, invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_invoiceStatusJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @returns {any}
     */
    invoiceStatusValue(node, invoice) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_invoiceStatusValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetCfaJson(node, request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_issueAssetCfaJson(this.__wbg_ptr, node.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetCfaValue(node, request_js) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_issueAssetCfaValue(this.__wbg_ptr, node.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetIfaJson(node, request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_issueAssetIfaJson(this.__wbg_ptr, node.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetIfaValue(node, request_js) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_issueAssetIfaValue(this.__wbg_ptr, node.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetNiaJson(node, request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_issueAssetNiaJson(this.__wbg_ptr, node.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetNiaValue(node, request_js) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_issueAssetNiaValue(this.__wbg_ptr, node.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} request_json
     * @returns {Promise<string>}
     */
    issueAssetUdaJson(request_json) {
        const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_issueAssetUdaJson(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} _request_json
     * @returns {Promise<any>}
     */
    issueAssetUdaValue(_request_json) {
        const ptr0 = passStringToWasm0(_request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_issueAssetUdaValue(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} dest_pubkey
     * @param {bigint} amt_msat
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    keysendJson(node, dest_pubkey, amt_msat, asset_id, asset_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(dest_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_keysendJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} dest_pubkey
     * @param {bigint} amt_msat
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    keysendValue(node, dest_pubkey, amt_msat, asset_id, asset_amount) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(dest_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_keysendValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    ldkRuntimeComponentsJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_ldkRuntimeComponentsJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    ldkRuntimeComponentsValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_ldkRuntimeComponentsValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    ldkRuntimeStatusJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_ldkRuntimeStatusJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    ldkRuntimeStatusValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_ldkRuntimeStatusValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    listChannelsJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_listChannelsJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    listChannelsValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_listChannelsValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    listPaymentsJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_listPaymentsJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    listPaymentsValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_listPaymentsValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    listPeersJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_listPeersJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    listPeersValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_listPeersValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    listPendingFundingRequestsJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_listPendingFundingRequestsJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    listPendingFundingRequestsValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_listPendingFundingRequestsValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    listRgbLnTransfersJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_listRgbLnTransfersJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    listRgbLnTransfersValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_listRgbLnTransfersValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    listRuntimeEventsJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_listRuntimeEventsJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    listRuntimeEventsValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_listRuntimeEventsValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {Promise<string>}
     */
    listSwapsJson() {
        const ret = wasm.rlnwasmsdk_listSwapsJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    listSwapsValue() {
        const ret = wasm.rlnwasmsdk_listSwapsValue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<void>}
     */
    lock() {
        const ret = wasm.rlnwasmsdk_lock(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} swap_string
     * @returns {Promise<string>}
     */
    makerExecuteJson(swap_string) {
        const ptr0 = passStringToWasm0(swap_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_makerExecuteJson(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} swap_string
     * @returns {Promise<any>}
     */
    makerExecuteValue(swap_string) {
        const ptr0 = passStringToWasm0(swap_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_makerExecuteValue(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} request_json
     * @returns {Promise<string>}
     */
    makerInitJson(request_json) {
        const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_makerInitJson(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} request_json
     * @returns {Promise<any>}
     */
    makerInitValue(request_json) {
        const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_makerInitValue(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    nativeRuntimeCoreStatusJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_nativeRuntimeCoreStatusJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    nativeRuntimeCoreStatusValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_nativeRuntimeCoreStatusValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    networkInfoJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_networkInfoJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    networkInfoValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_networkInfoValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    constructor() {
        const ret = wasm.rlnwasmsdk_new();
        this.__wbg_ptr = ret >>> 0;
        RlnWasmSdkFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} proxy_url
     * @returns {RlnWasmNode}
     */
    newNode(proxy_url) {
        const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_newNode(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RlnWasmNode.__wrap(ret[0]);
    }
    /**
     * @param {string} proxy_url
     * @param {string} node_runtime_id
     * @returns {RlnWasmNode}
     */
    newNodeWithRuntimeId(proxy_url, node_runtime_id) {
        const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(node_runtime_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_newNodeWithRuntimeId(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RlnWasmNode.__wrap(ret[0]);
    }
    /**
     * @param {string} wallet_data_json
     * @returns {RlnWasmWallet}
     */
    newWallet(wallet_data_json) {
        const ptr0 = passStringToWasm0(wallet_data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_newWallet(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RlnWasmWallet.__wrap(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    nodeInfoJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_nodeInfoJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    nodeInfoValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_nodeInfoValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    nodePubkeyJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_nodePubkeyJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    nodePubkeyValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_nodePubkeyValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @returns {string}
     */
    openChannelJson(node, peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_openChannelJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @returns {any}
     */
    openChannelValue(node, peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_openChannelValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} mime
     * @param {string} bytes_hex
     * @returns {Promise<string>}
     */
    postAssetMediaJson(mime, bytes_hex) {
        const ptr0 = passStringToWasm0(mime, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(bytes_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_postAssetMediaJson(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @param {string} mime
     * @param {string} bytes_hex
     * @returns {Promise<any>}
     */
    postAssetMediaValue(mime, bytes_hex) {
        const ptr0 = passStringToWasm0(mime, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(bytes_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_postAssetMediaValue(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @returns {Promise<void>}
     */
    preloadPersistentRuntimeState() {
        const ret = wasm.rlnwasmsdk_preloadPersistentRuntimeState(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    processNativeRuntimeQueueJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_processNativeRuntimeQueueJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    processNativeRuntimeQueueValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_processNativeRuntimeQueueValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     */
    reconnectManagerOnResume(node) {
        _assertClass(node, RlnWasmNode);
        wasm.rlnwasmsdk_reconnectManagerOnResume(this.__wbg_ptr, node.__wbg_ptr);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    reconnectManagerStartJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_reconnectManagerStartJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    reconnectManagerStartValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_reconnectManagerStartValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    reconnectManagerStatusJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_reconnectManagerStatusJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    reconnectManagerStatusValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_reconnectManagerStatusValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    reconnectManagerStopJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_reconnectManagerStopJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    reconnectManagerStopValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_reconnectManagerStopValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {Promise<string>}
     */
    reconnectPersistedPeersJson(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_reconnectPersistedPeersJson(this.__wbg_ptr, node.__wbg_ptr);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {Promise<any>}
     */
    reconnectPersistedPeersValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_reconnectPersistedPeersValue(this.__wbg_ptr, node.__wbg_ptr);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {string}
     */
    relaySessionAuthJson(node) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_relaySessionAuthJson(this.__wbg_ptr, node.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @returns {any}
     */
    relaySessionAuthValue(node) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_relaySessionAuthValue(this.__wbg_ptr, node.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    runtimeCapabilitiesJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdk_runtimeCapabilitiesJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    runtimeCapabilitiesValue() {
        const ret = wasm.rlnwasmsdk_runtimeCapabilitiesValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} request_json
     * @returns {Promise<void>}
     */
    sendOnionMessage(request_json) {
        const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_sendOnionMessage(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @param {bigint | null} [amt_msat]
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    sendPaymentJson(node, invoice, amt_msat, asset_id, asset_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_sendPaymentJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @param {bigint | null} [amt_msat]
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    sendPaymentValue(node, invoice, amt_msat, asset_id, asset_amount) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_sendPaymentValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} request_json
     * @returns {Promise<string>}
     */
    sendRgbFromGroupsJson(request_json) {
        const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_sendRgbFromGroupsJson(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} _request_json
     * @returns {Promise<any>}
     */
    sendRgbFromGroupsValue(_request_json) {
        const ptr0 = passStringToWasm0(_request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_sendRgbFromGroupsValue(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {boolean} enabled
     */
    setDefaultEnableVirtualChannelsV0(enabled) {
        wasm.rlnwasmsdk_setDefaultEnableVirtualChannelsV0(this.__wbg_ptr, enabled);
    }
    /**
     * @param {string} endpoint
     * @param {string | null} [auth_token]
     * @param {string | null} [node_id]
     */
    setDefaultRgbProxyTransport(endpoint, auth_token, node_id) {
        const ptr0 = passStringToWasm0(endpoint, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(auth_token) ? 0 : passStringToWasm0(auth_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(node_id) ? 0 : passStringToWasm0(node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_setDefaultRgbProxyTransport(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {boolean} enabled
     */
    setEnableVirtualChannelsV0(node, enabled) {
        _assertClass(node, RlnWasmNode);
        wasm.rlnwasmsdk_setEnableVirtualChannelsV0(this.__wbg_ptr, node.__wbg_ptr, enabled);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string | null} [relay_auth_token]
     * @param {string | null} [relay_node_id]
     */
    setRelaySessionAuth(node, relay_auth_token, relay_node_id) {
        _assertClass(node, RlnWasmNode);
        var ptr0 = isLikeNone(relay_auth_token) ? 0 : passStringToWasm0(relay_auth_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(relay_node_id) ? 0 : passStringToWasm0(relay_node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_setRelaySessionAuth(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} message
     * @returns {string}
     */
    signMessageJson(node, message) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_signMessageJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} message
     * @returns {any}
     */
    signMessageValue(node, message) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_signMessageValue(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {any} submission_js
     * @returns {string}
     */
    submitFundingTransactionJson(node, submission_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ret = wasm.rlnwasmsdk_submitFundingTransactionJson(this.__wbg_ptr, node.__wbg_ptr, submission_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {any} submission_js
     * @returns {any}
     */
    submitFundingTransactionValue(node, submission_js) {
        _assertClass(node, RlnWasmNode);
        const ret = wasm.rlnwasmsdk_submitFundingTransactionValue(this.__wbg_ptr, node.__wbg_ptr, submission_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} request_json
     * @returns {Promise<void>}
     */
    taker(request_json) {
        const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_taker(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} request_json
     * @returns {Promise<void>}
     */
    unlock(request_json) {
        const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_unlock(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payment_hash
     * @param {string} status
     * @returns {any}
     */
    updatePaymentStatus(node, payment_hash, status) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_updatePaymentStatus(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @param {string} status
     * @returns {any}
     */
    updatePaymentStatusByInvoice(node, invoice, status) {
        _assertClass(node, RlnWasmNode);
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_updatePaymentStatusByInvoice(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} invoice
     * @param {string} status
     * @returns {string}
     */
    updatePaymentStatusByInvoiceJson(node, invoice, status) {
        let deferred4_0;
        let deferred4_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_updatePaymentStatusByInvoiceJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {RlnWasmNode} node
     * @param {string} payment_hash
     * @param {string} status
     * @returns {string}
     */
    updatePaymentStatusJson(node, payment_hash, status) {
        let deferred4_0;
        let deferred4_1;
        try {
            _assertClass(node, RlnWasmNode);
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_updatePaymentStatusJson(this.__wbg_ptr, node.__wbg_ptr, ptr0, len0, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    version() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.rlnwasmsdk_version(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     */
    walletClearRgbProxyTransport(wallet) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_walletClearRgbProxyTransport(this.__wbg_ptr, wallet.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @returns {string}
     */
    walletGetAddress(wallet) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ret = wasm.rlnwasmsdk_walletGetAddress(this.__wbg_ptr, wallet.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {string} asset_id
     * @returns {string}
     */
    walletGetAssetMediaJson(wallet, asset_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_walletGetAssetMediaJson(this.__wbg_ptr, wallet.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {string} asset_id
     * @returns {any}
     */
    walletGetAssetMediaValue(wallet, asset_id) {
        _assertClass(wallet, RlnWasmWallet);
        const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_walletGetAssetMediaValue(this.__wbg_ptr, wallet.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @returns {string}
     */
    walletGetBtcBalanceJson(wallet) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ret = wasm.rlnwasmsdk_walletGetBtcBalanceJson(this.__wbg_ptr, wallet.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @returns {any}
     */
    walletGetBtcBalanceValue(wallet) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_walletGetBtcBalanceValue(this.__wbg_ptr, wallet.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {any} request_js
     * @returns {string}
     */
    walletIssueAssetUdaJson(wallet, request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ret = wasm.rlnwasmsdk_walletIssueAssetUdaJson(this.__wbg_ptr, wallet.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {any} request_js
     * @returns {any}
     */
    walletIssueAssetUdaValue(wallet, request_js) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_walletIssueAssetUdaValue(this.__wbg_ptr, wallet.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {any} filter_asset_schemas_js
     * @returns {string}
     */
    walletListAssetsJson(wallet, filter_asset_schemas_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ret = wasm.rlnwasmsdk_walletListAssetsJson(this.__wbg_ptr, wallet.__wbg_ptr, filter_asset_schemas_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {any} filter_asset_schemas_js
     * @returns {any}
     */
    walletListAssetsValue(wallet, filter_asset_schemas_js) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_walletListAssetsValue(this.__wbg_ptr, wallet.__wbg_ptr, filter_asset_schemas_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @returns {string}
     */
    walletListTransactionsJson(wallet) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ret = wasm.rlnwasmsdk_walletListTransactionsJson(this.__wbg_ptr, wallet.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @returns {any}
     */
    walletListTransactionsValue(wallet) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_walletListTransactionsValue(this.__wbg_ptr, wallet.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @returns {string}
     */
    walletRgbProxyTransportJson(wallet) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ret = wasm.rlnwasmsdk_walletRgbProxyTransportJson(this.__wbg_ptr, wallet.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @returns {any}
     */
    walletRgbProxyTransportValue(wallet) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_walletRgbProxyTransportValue(this.__wbg_ptr, wallet.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {any} request_js
     * @returns {Promise<string>}
     */
    walletSendRgbFromGroupsJson(wallet, request_js) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_walletSendRgbFromGroupsJson(this.__wbg_ptr, wallet.__wbg_ptr, request_js);
        return ret;
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {any} request_js
     * @returns {Promise<any>}
     */
    walletSendRgbFromGroupsValue(wallet, request_js) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdk_walletSendRgbFromGroupsValue(this.__wbg_ptr, wallet.__wbg_ptr, request_js);
        return ret;
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {string} endpoint
     * @param {string | null} [auth_token]
     * @param {string | null} [node_id]
     */
    walletSetRgbProxyTransport(wallet, endpoint, auth_token, node_id) {
        _assertClass(wallet, RlnWasmWallet);
        const ptr0 = passStringToWasm0(endpoint, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(auth_token) ? 0 : passStringToWasm0(auth_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(node_id) ? 0 : passStringToWasm0(node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdk_walletSetRgbProxyTransport(this.__wbg_ptr, wallet.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {string} unsigned_psbt
     * @returns {string}
     */
    walletSignPsbtJson(wallet, unsigned_psbt) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ptr0 = passStringToWasm0(unsigned_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_walletSignPsbtJson(this.__wbg_ptr, wallet.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {RlnWasmWallet} wallet
     * @param {string} unsigned_psbt
     * @returns {string}
     */
    walletSignPsbtValue(wallet, unsigned_psbt) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(wallet, RlnWasmWallet);
            const ptr0 = passStringToWasm0(unsigned_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdk_walletSignPsbtValue(this.__wbg_ptr, wallet.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
}
if (Symbol.dispose) RlnWasmSdk.prototype[Symbol.dispose] = RlnWasmSdk.prototype.free;

export class RlnWasmSdkNodeHandle {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RlnWasmSdkNodeHandle.prototype);
        obj.__wbg_ptr = ptr;
        RlnWasmSdkNodeHandleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmSdkNodeHandleFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasmsdknodehandle_free(ptr, 0);
    }
    /**
     * @param {RlnWasmWallet} wallet
     */
    attachWallet(wallet) {
        _assertClass(wallet, RlnWasmWallet);
        const ret = wasm.rlnwasmsdknodehandle_attachWallet(this.__wbg_ptr, wallet.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} txid
     * @param {string} tx_hex
     */
    chainSyncEnqueueRebroadcastTx(txid, tx_hex) {
        const ptr0 = passStringToWasm0(txid, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(tx_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_chainSyncEnqueueRebroadcastTx(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} indexer_url
     * @param {number | null} [poll_interval_ms]
     * @returns {string}
     */
    chainSyncStartJson(indexer_url, poll_interval_ms) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_chainSyncStartJson(this.__wbg_ptr, ptr0, len0, isLikeNone(poll_interval_ms) ? 0x100000001 : (poll_interval_ms) >>> 0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} indexer_url
     * @param {number | null} [poll_interval_ms]
     * @returns {any}
     */
    chainSyncStartValue(indexer_url, poll_interval_ms) {
        const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_chainSyncStartValue(this.__wbg_ptr, ptr0, len0, isLikeNone(poll_interval_ms) ? 0x100000001 : (poll_interval_ms) >>> 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    chainSyncStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_chainSyncStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    chainSyncStatusValue() {
        const ret = wasm.rlnwasmsdknodehandle_chainSyncStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    chainSyncStopJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_chainSyncStopJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    chainSyncStopValue() {
        const ret = wasm.rlnwasmsdknodehandle_chainSyncStopValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {Promise<string>}
     */
    chainSyncTickJson() {
        const ret = wasm.rlnwasmsdknodehandle_chainSyncTickJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    chainSyncTickValue() {
        const ret = wasm.rlnwasmsdknodehandle_chainSyncTickValue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} channel_id
     */
    closeChannel(channel_id) {
        const ptr0 = passStringToWasm0(channel_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_closeChannel(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} channel_id
     * @param {string | null | undefined} peer_pubkey
     * @param {boolean} force
     */
    closeChannelWithOptions(channel_id, peer_pubkey, force) {
        const ptr0 = passStringToWasm0(channel_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(peer_pubkey) ? 0 : passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_closeChannelWithOptions(this.__wbg_ptr, ptr0, len0, ptr1, len1, force);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} peer_addr
     * @param {string} peer_pubkey
     * @returns {Promise<void>}
     */
    connectPeer(peer_addr, peer_pubkey) {
        const ptr0 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_connectPeer(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @param {bigint | null | undefined} amt_msat
     * @param {number} expiry_sec
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    createLnInvoiceJson(amt_msat, expiry_sec, asset_id, asset_amount) {
        let deferred3_0;
        let deferred3_1;
        try {
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_createLnInvoiceJson(this.__wbg_ptr, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, expiry_sec, ptr0, len0, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @returns {string}
     */
    decodeLnInvoiceJson(invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_decodeLnInvoiceJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @returns {any}
     */
    decodeLnInvoiceValue(invoice) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_decodeLnInvoiceValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @returns {string}
     */
    decodeRgbInvoiceJson(invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_decodeRgbInvoiceJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @returns {any}
     */
    decodeRgbInvoiceValue(invoice) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_decodeRgbInvoiceValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} peer_pubkey
     * @returns {Promise<void>}
     */
    disconnectPeer(peer_pubkey) {
        const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_disconnectPeer(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @returns {string}
     */
    drainNativeRuntimeQueueJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_drainNativeRuntimeQueueJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    drainNativeRuntimeQueueValue() {
        const ret = wasm.rlnwasmsdknodehandle_drainNativeRuntimeQueueValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    enableVirtualChannelsV0Json() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_enableVirtualChannelsV0Json(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    enableVirtualChannelsV0Value() {
        const ret = wasm.rlnwasmsdknodehandle_enableVirtualChannelsV0Value(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} temporary_channel_id
     * @returns {string}
     */
    getChannelId(temporary_channel_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(temporary_channel_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_getChannelId(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payment_hash
     * @returns {string}
     */
    getPaymentJson(payment_hash) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_getPaymentJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payment_hash
     * @returns {any}
     */
    getPaymentValue(payment_hash) {
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_getPaymentValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} payload_hex
     * @returns {any}
     */
    ingestReadEventPayloadHex(payload_hex) {
        const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_ingestReadEventPayloadHex(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} payload_hex
     * @returns {string}
     */
    ingestReadEventPayloadHexJson(payload_hex) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_ingestReadEventPayloadHexJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payload_hex
     * @returns {string}
     */
    ingestRuntimeTransportEventPayloadHexJson(payload_hex) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_ingestRuntimeTransportEventPayloadHexJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} payload_hex
     * @returns {any}
     */
    ingestRuntimeTransportEventPayloadHexValue(payload_hex) {
        const ptr0 = passStringToWasm0(payload_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_ingestRuntimeTransportEventPayloadHexValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @returns {string}
     */
    invoiceStatusJson(invoice) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_invoiceStatusJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @returns {any}
     */
    invoiceStatusValue(invoice) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_invoiceStatusValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetCfaJson(request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_issueAssetCfaJson(this.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetCfaValue(request_js) {
        const ret = wasm.rlnwasmsdknodehandle_issueAssetCfaValue(this.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetNiaJson(request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_issueAssetNiaJson(this.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetNiaValue(request_js) {
        const ret = wasm.rlnwasmsdknodehandle_issueAssetNiaValue(this.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} dest_pubkey
     * @param {bigint} amt_msat
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    keysendJson(dest_pubkey, amt_msat, asset_id, asset_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(dest_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_keysendJson(this.__wbg_ptr, ptr0, len0, amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} dest_pubkey
     * @param {bigint} amt_msat
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    keysendValue(dest_pubkey, amt_msat, asset_id, asset_amount) {
        const ptr0 = passStringToWasm0(dest_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_keysendValue(this.__wbg_ptr, ptr0, len0, amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    ldkRuntimeComponentsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_ldkRuntimeComponentsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    ldkRuntimeComponentsValue() {
        const ret = wasm.rlnwasmsdknodehandle_ldkRuntimeComponentsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    ldkRuntimeStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_ldkRuntimeStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    ldkRuntimeStatusValue() {
        const ret = wasm.rlnwasmsdknodehandle_ldkRuntimeStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listChannelsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_listChannelsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listChannelsValue() {
        const ret = wasm.rlnwasmsdknodehandle_listChannelsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listPaymentsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_listPaymentsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listPaymentsValue() {
        const ret = wasm.rlnwasmsdknodehandle_listPaymentsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listPeersJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_listPeersJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listPeersValue() {
        const ret = wasm.rlnwasmsdknodehandle_listPeersValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listPendingFundingRequestsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_listPendingFundingRequestsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listPendingFundingRequestsValue() {
        const ret = wasm.rlnwasmsdknodehandle_listPendingFundingRequestsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listRgbLnTransfersJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_listRgbLnTransfersJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listRgbLnTransfersValue() {
        const ret = wasm.rlnwasmsdknodehandle_listRgbLnTransfersValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listRuntimeEventsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_listRuntimeEventsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listRuntimeEventsValue() {
        const ret = wasm.rlnwasmsdknodehandle_listRuntimeEventsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    nativeRuntimeCoreStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_nativeRuntimeCoreStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    nativeRuntimeCoreStatusValue() {
        const ret = wasm.rlnwasmsdknodehandle_nativeRuntimeCoreStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    networkInfoJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_networkInfoJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    networkInfoValue() {
        const ret = wasm.rlnwasmsdknodehandle_networkInfoValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    nodeInfoJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_nodeInfoJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    nodeInfoValue() {
        const ret = wasm.rlnwasmsdknodehandle_nodeInfoValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    nodePubkeyJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_nodePubkeyJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    nodePubkeyValue() {
        const ret = wasm.rlnwasmsdknodehandle_nodePubkeyValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @returns {string}
     */
    openChannelJson(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_openChannelJson(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @param {string | null} [virtual_open_mode]
     * @returns {string}
     */
    openChannelJsonWithOptions(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount, virtual_open_mode) {
        let deferred5_0;
        let deferred5_1;
        try {
            const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            var ptr2 = isLikeNone(virtual_open_mode) ? 0 : passStringToWasm0(virtual_open_mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len2 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_openChannelJsonWithOptions(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount, ptr2, len2);
            var ptr4 = ret[0];
            var len4 = ret[1];
            if (ret[3]) {
                ptr4 = 0; len4 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @returns {any}
     */
    openChannelValue(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount) {
        const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_openChannelValue(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} peer_pubkey
     * @param {bigint} capacity_sat
     * @param {boolean} _public
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_local_amount]
     * @param {string | null} [virtual_open_mode]
     * @returns {any}
     */
    openChannelValueWithOptions(peer_pubkey, capacity_sat, _public, asset_id, asset_local_amount, virtual_open_mode) {
        const ptr0 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(virtual_open_mode) ? 0 : passStringToWasm0(virtual_open_mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_openChannelValueWithOptions(this.__wbg_ptr, ptr0, len0, capacity_sat, _public, ptr1, len1, !isLikeNone(asset_local_amount), isLikeNone(asset_local_amount) ? BigInt(0) : asset_local_amount, ptr2, len2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    processNativeRuntimeQueueJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_processNativeRuntimeQueueJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    processNativeRuntimeQueueValue() {
        const ret = wasm.rlnwasmsdknodehandle_processNativeRuntimeQueueValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    reconnectManagerOnResume() {
        wasm.rlnwasmsdknodehandle_reconnectManagerOnResume(this.__wbg_ptr);
    }
    /**
     * @returns {string}
     */
    reconnectManagerStartJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_reconnectManagerStartJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    reconnectManagerStartValue() {
        const ret = wasm.rlnwasmsdknodehandle_reconnectManagerStartValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    reconnectManagerStatusJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_reconnectManagerStatusJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    reconnectManagerStatusValue() {
        const ret = wasm.rlnwasmsdknodehandle_reconnectManagerStatusValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    reconnectManagerStopJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_reconnectManagerStopJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    reconnectManagerStopValue() {
        const ret = wasm.rlnwasmsdknodehandle_reconnectManagerStopValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {Promise<string>}
     */
    reconnectPersistedPeersJson() {
        const ret = wasm.rlnwasmsdknodehandle_reconnectPersistedPeersJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    reconnectPersistedPeersValue() {
        const ret = wasm.rlnwasmsdknodehandle_reconnectPersistedPeersValue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    relaySessionAuthJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_relaySessionAuthJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    relaySessionAuthValue() {
        const ret = wasm.rlnwasmsdknodehandle_relaySessionAuthValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @param {bigint | null} [amt_msat]
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {string}
     */
    sendPaymentJson(invoice, amt_msat, asset_id, asset_amount) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_sendPaymentJson(this.__wbg_ptr, ptr0, len0, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} invoice
     * @param {bigint | null} [amt_msat]
     * @param {string | null} [asset_id]
     * @param {bigint | null} [asset_amount]
     * @returns {any}
     */
    sendPaymentValue(invoice, amt_msat, asset_id, asset_amount) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_sendPaymentValue(this.__wbg_ptr, ptr0, len0, !isLikeNone(amt_msat), isLikeNone(amt_msat) ? BigInt(0) : amt_msat, ptr1, len1, !isLikeNone(asset_amount), isLikeNone(asset_amount) ? BigInt(0) : asset_amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {boolean} enabled
     */
    setEnableVirtualChannelsV0(enabled) {
        wasm.rlnwasmsdknodehandle_setEnableVirtualChannelsV0(this.__wbg_ptr, enabled);
    }
    /**
     * @param {string | null} [relay_auth_token]
     * @param {string | null} [relay_node_id]
     */
    setRelaySessionAuth(relay_auth_token, relay_node_id) {
        var ptr0 = isLikeNone(relay_auth_token) ? 0 : passStringToWasm0(relay_auth_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(relay_node_id) ? 0 : passStringToWasm0(relay_node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_setRelaySessionAuth(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} message
     * @returns {string}
     */
    signMessageJson(message) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_signMessageJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} message
     * @returns {any}
     */
    signMessageValue(message) {
        const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_signMessageValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} submission_js
     * @returns {string}
     */
    submitFundingTransactionJson(submission_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdknodehandle_submitFundingTransactionJson(this.__wbg_ptr, submission_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} submission_js
     * @returns {any}
     */
    submitFundingTransactionValue(submission_js) {
        const ret = wasm.rlnwasmsdknodehandle_submitFundingTransactionValue(this.__wbg_ptr, submission_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} payment_hash
     * @param {string} status
     * @returns {any}
     */
    updatePaymentStatus(payment_hash, status) {
        const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_updatePaymentStatus(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @param {string} status
     * @returns {any}
     */
    updatePaymentStatusByInvoice(invoice, status) {
        const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdknodehandle_updatePaymentStatusByInvoice(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} invoice
     * @param {string} status
     * @returns {string}
     */
    updatePaymentStatusByInvoiceJson(invoice, status) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(invoice, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_updatePaymentStatusByInvoiceJson(this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * @param {string} payment_hash
     * @param {string} status
     * @returns {string}
     */
    updatePaymentStatusJson(payment_hash, status) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(payment_hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdknodehandle_updatePaymentStatusJson(this.__wbg_ptr, ptr0, len0, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
}
if (Symbol.dispose) RlnWasmSdkNodeHandle.prototype[Symbol.dispose] = RlnWasmSdkNodeHandle.prototype.free;

export class RlnWasmSdkWalletHandle {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RlnWasmSdkWalletHandle.prototype);
        obj.__wbg_ptr = ptr;
        RlnWasmSdkWalletHandleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmSdkWalletHandleFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasmsdkwallethandle_free(ptr, 0);
    }
    /**
     * @param {string | null | undefined} asset_id
     * @param {any} assignment_js
     * @param {number | null | undefined} duration_seconds
     * @param {any} transport_endpoints_js
     * @param {number} min_confirmations
     * @returns {string}
     */
    blindReceiveJson(asset_id, assignment_js, duration_seconds, transport_endpoints_js, min_confirmations) {
        let deferred3_0;
        let deferred3_1;
        try {
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdkwallethandle_blindReceiveJson(this.__wbg_ptr, ptr0, len0, assignment_js, isLikeNone(duration_seconds) ? 0x100000001 : (duration_seconds) >>> 0, transport_endpoints_js, min_confirmations);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string | null | undefined} asset_id
     * @param {any} assignment_js
     * @param {number | null | undefined} duration_seconds
     * @param {any} transport_endpoints_js
     * @param {number} min_confirmations
     * @returns {any}
     */
    blindReceiveValue(asset_id, assignment_js, duration_seconds, transport_endpoints_js, min_confirmations) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdkwallethandle_blindReceiveValue(this.__wbg_ptr, ptr0, len0, assignment_js, isLikeNone(duration_seconds) ? 0x100000001 : (duration_seconds) >>> 0, transport_endpoints_js, min_confirmations);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    clearRgbProxyTransport() {
        const ret = wasm.rlnwasmsdkwallethandle_clearRgbProxyTransport(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {string}
     */
    getAddress() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdkwallethandle_getAddress(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {string} asset_id
     * @returns {string}
     */
    getAssetMediaJson(asset_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdkwallethandle_getAssetMediaJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} asset_id
     * @returns {any}
     */
    getAssetMediaValue(asset_id) {
        const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdkwallethandle_getAssetMediaValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    getBtcBalanceJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdkwallethandle_getBtcBalanceJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    getBtcBalanceValue() {
        const ret = wasm.rlnwasmsdkwallethandle_getBtcBalanceValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} online_js
     * @param {number} blocks
     * @returns {Promise<number>}
     */
    getFeeEstimation(online_js, blocks) {
        const ret = wasm.rlnwasmsdkwallethandle_getFeeEstimation(this.__wbg_ptr, online_js, blocks);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {number} blocks
     * @returns {Promise<string>}
     */
    getFeeEstimationJson(online_js, blocks) {
        const ret = wasm.rlnwasmsdkwallethandle_getFeeEstimationJson(this.__wbg_ptr, online_js, blocks);
        return ret;
    }
    /**
     * @param {boolean} skip_consistency_check
     * @param {string} indexer_url
     * @returns {Promise<string>}
     */
    goOnlineJson(skip_consistency_check, indexer_url) {
        const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdkwallethandle_goOnlineJson(this.__wbg_ptr, skip_consistency_check, ptr0, len0);
        return ret;
    }
    /**
     * @param {boolean} skip_consistency_check
     * @param {string} indexer_url
     * @returns {Promise<any>}
     */
    goOnlineValue(skip_consistency_check, indexer_url) {
        const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdkwallethandle_goOnlineValue(this.__wbg_ptr, skip_consistency_check, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetUdaJson(request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdkwallethandle_issueAssetUdaJson(this.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetUdaValue(request_js) {
        const ret = wasm.rlnwasmsdkwallethandle_issueAssetUdaValue(this.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} filter_asset_schemas_js
     * @returns {string}
     */
    listAssetsJson(filter_asset_schemas_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdkwallethandle_listAssetsJson(this.__wbg_ptr, filter_asset_schemas_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} filter_asset_schemas_js
     * @returns {any}
     */
    listAssetsValue(filter_asset_schemas_js) {
        const ret = wasm.rlnwasmsdkwallethandle_listAssetsValue(this.__wbg_ptr, filter_asset_schemas_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listTransactionsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdkwallethandle_listTransactionsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listTransactionsValue() {
        const ret = wasm.rlnwasmsdkwallethandle_listTransactionsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} online_js
     * @param {string | null | undefined} asset_id
     * @param {any} filter_js
     * @param {boolean} skip_sync
     * @returns {Promise<any>}
     */
    refreshValue(online_js, asset_id, filter_js, skip_sync) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdkwallethandle_refreshValue(this.__wbg_ptr, online_js, ptr0, len0, filter_js, skip_sync);
        return ret;
    }
    /**
     * @returns {string}
     */
    rgbProxyTransportJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmsdkwallethandle_rgbProxyTransportJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    rgbProxyTransportValue() {
        const ret = wasm.rlnwasmsdkwallethandle_rgbProxyTransportValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} online_js
     * @param {string} address
     * @param {bigint} amount
     * @param {bigint} fee_rate
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    sendBtcBegin(online_js, address, amount, fee_rate, skip_sync) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdkwallethandle_sendBtcBegin(this.__wbg_ptr, online_js, ptr0, len0, amount, fee_rate, skip_sync);
        return ret;
    }
    /**
     * @param {any} request_js
     * @returns {Promise<string>}
     */
    sendRgbFromGroupsJson(request_js) {
        const ret = wasm.rlnwasmsdkwallethandle_sendRgbFromGroupsJson(this.__wbg_ptr, request_js);
        return ret;
    }
    /**
     * @param {any} request_js
     * @returns {Promise<any>}
     */
    sendRgbFromGroupsValue(request_js) {
        const ret = wasm.rlnwasmsdkwallethandle_sendRgbFromGroupsValue(this.__wbg_ptr, request_js);
        return ret;
    }
    /**
     * @param {string} endpoint
     * @param {string | null} [auth_token]
     * @param {string | null} [node_id]
     */
    setRgbProxyTransport(endpoint, auth_token, node_id) {
        const ptr0 = passStringToWasm0(endpoint, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(auth_token) ? 0 : passStringToWasm0(auth_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(node_id) ? 0 : passStringToWasm0(node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmsdkwallethandle_setRgbProxyTransport(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} unsigned_psbt
     * @returns {string}
     */
    signPsbtJson(unsigned_psbt) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(unsigned_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdkwallethandle_signPsbtJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} unsigned_psbt
     * @returns {string}
     */
    signPsbtValue(unsigned_psbt) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(unsigned_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmsdkwallethandle_signPsbtValue(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {any} online_js
     * @returns {Promise<void>}
     */
    syncOnline(online_js) {
        const ret = wasm.rlnwasmsdkwallethandle_syncOnline(this.__wbg_ptr, online_js);
        return ret;
    }
}
if (Symbol.dispose) RlnWasmSdkWalletHandle.prototype[Symbol.dispose] = RlnWasmSdkWalletHandle.prototype.free;

export class RlnWasmWallet {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RlnWasmWallet.prototype);
        obj.__wbg_ptr = ptr;
        RlnWasmWalletFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RlnWasmWalletFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rlnwasmwallet_free(ptr, 0);
    }
    /**
     * @param {string} password
     * @returns {Uint8Array}
     */
    backup(password) {
        const ptr0 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_backup(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v2;
    }
    /**
     * @returns {boolean}
     */
    backupInfo() {
        const ret = wasm.rlnwasmwallet_backupInfo(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @returns {string}
     */
    backupInfoJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_backupInfoJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {string | null | undefined} asset_id
     * @param {any} assignment_js
     * @param {number | null | undefined} duration_seconds
     * @param {any} transport_endpoints_js
     * @param {number} min_confirmations
     * @returns {string}
     */
    blindReceiveJson(asset_id, assignment_js, duration_seconds, transport_endpoints_js, min_confirmations) {
        let deferred3_0;
        let deferred3_1;
        try {
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmwallet_blindReceiveJson(this.__wbg_ptr, ptr0, len0, assignment_js, isLikeNone(duration_seconds) ? 0x100000001 : (duration_seconds) >>> 0, transport_endpoints_js, min_confirmations);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string | null | undefined} asset_id
     * @param {any} assignment_js
     * @param {number | null | undefined} duration_seconds
     * @param {any} transport_endpoints_js
     * @param {number} min_confirmations
     * @returns {any}
     */
    blindReceiveValue(asset_id, assignment_js, duration_seconds, transport_endpoints_js, min_confirmations) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_blindReceiveValue(this.__wbg_ptr, ptr0, len0, assignment_js, isLikeNone(duration_seconds) ? 0x100000001 : (duration_seconds) >>> 0, transport_endpoints_js, min_confirmations);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} online_js
     * @param {string} output_script_hex
     * @param {bigint} amount_sat
     * @param {bigint} fee_rate
     * @returns {Promise<string>}
     */
    buildLightningFundingTxJson(online_js, output_script_hex, amount_sat, fee_rate) {
        const ptr0 = passStringToWasm0(output_script_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_buildLightningFundingTxJson(this.__wbg_ptr, online_js, ptr0, len0, amount_sat, fee_rate);
        return ret;
    }
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
     * @param {any} online_js
     * @param {string} output_script_hex
     * @param {bigint} amount_sat
     * @param {bigint} fee_rate
     * @returns {Promise<any>}
     */
    buildLightningFundingTxValue(online_js, output_script_hex, amount_sat, fee_rate) {
        const ptr0 = passStringToWasm0(output_script_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_buildLightningFundingTxValue(this.__wbg_ptr, online_js, ptr0, len0, amount_sat, fee_rate);
        return ret;
    }
    clearRgbProxyTransport() {
        const ret = wasm.rlnwasmwallet_clearRgbProxyTransport(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} server_url
     * @param {string} store_id
     * @param {string} signing_key_hex
     */
    configureVssBackup(server_url, store_id, signing_key_hex) {
        const ptr0 = passStringToWasm0(server_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(store_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(signing_key_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_configureVssBackup(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} wallet_data_json
     * @returns {Promise<RlnWasmWallet>}
     */
    static create(wallet_data_json) {
        const ptr0 = passStringToWasm0(wallet_data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_create(ptr0, len0);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {boolean} up_to
     * @param {number | null | undefined} num
     * @param {number | null | undefined} size
     * @param {bigint} fee_rate
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    createUtxosBegin(online_js, up_to, num, size, fee_rate, skip_sync) {
        const ret = wasm.rlnwasmwallet_createUtxosBegin(this.__wbg_ptr, online_js, up_to, isLikeNone(num) ? 0xFFFFFF : num, isLikeNone(size) ? 0x100000001 : (size) >>> 0, fee_rate, skip_sync);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} signed_psbt
     * @param {boolean} skip_sync
     * @returns {Promise<number>}
     */
    createUtxosEnd(online_js, signed_psbt, skip_sync) {
        const ptr0 = passStringToWasm0(signed_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_createUtxosEnd(this.__wbg_ptr, online_js, ptr0, len0, skip_sync);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} signed_psbt
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    createUtxosEndJson(online_js, signed_psbt, skip_sync) {
        const ptr0 = passStringToWasm0(signed_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_createUtxosEndJson(this.__wbg_ptr, online_js, ptr0, len0, skip_sync);
        return ret;
    }
    /**
     * Errors with a retryable "wallet is busy" message if the wallet is
     * mid-operation — the disable must not be silently skipped, or backups would
     * keep flowing to a server the caller asked to disconnect from.
     */
    disableVssBackup() {
        const ret = wasm.rlnwasmwallet_disableVssBackup(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {any} online_js
     * @param {string} address
     * @param {boolean} destroy_assets
     * @param {bigint} fee_rate
     * @returns {Promise<string>}
     */
    drainToBegin(online_js, address, destroy_assets, fee_rate) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_drainToBegin(this.__wbg_ptr, online_js, ptr0, len0, destroy_assets, fee_rate);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} signed_psbt
     * @returns {Promise<string>}
     */
    drainToEnd(online_js, signed_psbt) {
        const ptr0 = passStringToWasm0(signed_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_drainToEnd(this.__wbg_ptr, online_js, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {number | null | undefined} batch_transfer_idx
     * @param {boolean} no_asset_only
     * @param {boolean} skip_sync
     * @returns {Promise<boolean>}
     */
    failTransfers(online_js, batch_transfer_idx, no_asset_only, skip_sync) {
        const ret = wasm.rlnwasmwallet_failTransfers(this.__wbg_ptr, online_js, isLikeNone(batch_transfer_idx) ? 0x100000001 : (batch_transfer_idx) >> 0, no_asset_only, skip_sync);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {number | null | undefined} batch_transfer_idx
     * @param {boolean} no_asset_only
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    failTransfersJson(online_js, batch_transfer_idx, no_asset_only, skip_sync) {
        const ret = wasm.rlnwasmwallet_failTransfersJson(this.__wbg_ptr, online_js, isLikeNone(batch_transfer_idx) ? 0x100000001 : (batch_transfer_idx) >> 0, no_asset_only, skip_sync);
        return ret;
    }
    /**
     * @returns {string}
     */
    getAddress() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_getAddress(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {string} asset_id
     * @returns {string}
     */
    getAssetBalanceJson(asset_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmwallet_getAssetBalanceJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} asset_id
     * @returns {any}
     */
    getAssetBalanceValue(asset_id) {
        const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_getAssetBalanceValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} asset_id
     * @returns {string}
     */
    getAssetMediaJson(asset_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmwallet_getAssetMediaJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} asset_id
     * @returns {any}
     */
    getAssetMediaValue(asset_id) {
        const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_getAssetMediaValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string} asset_id
     * @returns {string}
     */
    getAssetMetadataJson(asset_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmwallet_getAssetMetadataJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} asset_id
     * @returns {any}
     */
    getAssetMetadataValue(asset_id) {
        const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_getAssetMetadataValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    getBtcBalanceJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_getBtcBalanceJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    getBtcBalanceValue() {
        const ret = wasm.rlnwasmwallet_getBtcBalanceValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} online_js
     * @param {number} blocks
     * @returns {Promise<number>}
     */
    getFeeEstimation(online_js, blocks) {
        const ret = wasm.rlnwasmwallet_getFeeEstimation(this.__wbg_ptr, online_js, blocks);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {number} blocks
     * @returns {Promise<string>}
     */
    getFeeEstimationJson(online_js, blocks) {
        const ret = wasm.rlnwasmwallet_getFeeEstimationJson(this.__wbg_ptr, online_js, blocks);
        return ret;
    }
    /**
     * @returns {string}
     */
    getWalletDataJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_getWalletDataJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    getWalletDataValue() {
        const ret = wasm.rlnwasmwallet_getWalletDataValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {boolean} skip_consistency_check
     * @param {string} indexer_url
     * @returns {Promise<string>}
     */
    goOnlineJson(skip_consistency_check, indexer_url) {
        const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_goOnlineJson(this.__wbg_ptr, skip_consistency_check, ptr0, len0);
        return ret;
    }
    /**
     * @param {boolean} skip_consistency_check
     * @param {string} indexer_url
     * @returns {Promise<any>}
     */
    goOnlineValue(skip_consistency_check, indexer_url) {
        const ptr0 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_goOnlineValue(this.__wbg_ptr, skip_consistency_check, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} asset_id
     * @param {any} inflation_amounts_js
     * @param {bigint} fee_rate
     * @param {number} min_confirmations
     * @returns {Promise<string>}
     */
    inflateBegin(online_js, asset_id, inflation_amounts_js, fee_rate, min_confirmations) {
        const ptr0 = passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_inflateBegin(this.__wbg_ptr, online_js, ptr0, len0, inflation_amounts_js, fee_rate, min_confirmations);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} signed_psbt
     * @returns {Promise<string>}
     */
    inflateEndJson(online_js, signed_psbt) {
        const ptr0 = passStringToWasm0(signed_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_inflateEndJson(this.__wbg_ptr, online_js, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} signed_psbt
     * @returns {Promise<any>}
     */
    inflateEndValue(online_js, signed_psbt) {
        const ptr0 = passStringToWasm0(signed_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_inflateEndValue(this.__wbg_ptr, online_js, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} request_js
     * @returns {string}
     */
    issueAssetUdaJson(request_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_issueAssetUdaJson(this.__wbg_ptr, request_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} request_js
     * @returns {any}
     */
    issueAssetUdaValue(request_js) {
        const ret = wasm.rlnwasmwallet_issueAssetUdaValue(this.__wbg_ptr, request_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} filter_asset_schemas_js
     * @returns {string}
     */
    listAssetsJson(filter_asset_schemas_js) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_listAssetsJson(this.__wbg_ptr, filter_asset_schemas_js);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {any} filter_asset_schemas_js
     * @returns {any}
     */
    listAssetsValue(filter_asset_schemas_js) {
        const ret = wasm.rlnwasmwallet_listAssetsValue(this.__wbg_ptr, filter_asset_schemas_js);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @returns {string}
     */
    listTransactionsJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_listTransactionsJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    listTransactionsValue() {
        const ret = wasm.rlnwasmwallet_listTransactionsValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {string | null} [asset_id]
     * @returns {string}
     */
    listTransfersJson(asset_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmwallet_listTransfersJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string | null} [asset_id]
     * @returns {any}
     */
    listTransfersValue(asset_id) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_listTransfersValue(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {boolean} settled_only
     * @returns {string}
     */
    listUnspentsJson(settled_only) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_listUnspentsJson(this.__wbg_ptr, settled_only);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {boolean} settled_only
     * @returns {any}
     */
    listUnspentsValue(settled_only) {
        const ret = wasm.rlnwasmwallet_listUnspentsValue(this.__wbg_ptr, settled_only);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} online_js
     * @param {number} min_confirmations
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    listUnspentsVanillaJson(online_js, min_confirmations, skip_sync) {
        const ret = wasm.rlnwasmwallet_listUnspentsVanillaJson(this.__wbg_ptr, online_js, min_confirmations, skip_sync);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {number} min_confirmations
     * @param {boolean} skip_sync
     * @returns {Promise<any>}
     */
    listUnspentsVanillaValue(online_js, min_confirmations, skip_sync) {
        const ret = wasm.rlnwasmwallet_listUnspentsVanillaValue(this.__wbg_ptr, online_js, min_confirmations, skip_sync);
        return ret;
    }
    /**
     * @param {string} wallet_data_json
     */
    constructor(wallet_data_json) {
        const ptr0 = passStringToWasm0(wallet_data_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        RlnWasmWalletFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {any} online_js
     * @param {string | null | undefined} asset_id
     * @param {any} filter_js
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    refreshJson(online_js, asset_id, filter_js, skip_sync) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_refreshJson(this.__wbg_ptr, online_js, ptr0, len0, filter_js, skip_sync);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string | null | undefined} asset_id
     * @param {any} filter_js
     * @param {boolean} skip_sync
     * @returns {Promise<any>}
     */
    refreshValue(online_js, asset_id, filter_js, skip_sync) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_refreshValue(this.__wbg_ptr, online_js, ptr0, len0, filter_js, skip_sync);
        return ret;
    }
    /**
     * @param {Uint8Array} backup_bytes
     * @param {string} password
     */
    restoreBackup(backup_bytes, password) {
        const ptr0 = passArray8ToWasm0(backup_bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_restoreBackup(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {string}
     */
    rgbProxyTransportJson() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.rlnwasmwallet_rgbProxyTransportJson(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {any}
     */
    rgbProxyTransportValue() {
        const ret = wasm.rlnwasmwallet_rgbProxyTransportValue(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * @param {any} online_js
     * @param {any} recipient_map_js
     * @param {boolean} donation
     * @param {bigint} fee_rate
     * @param {number} min_confirmations
     * @returns {Promise<string>}
     */
    sendBegin(online_js, recipient_map_js, donation, fee_rate, min_confirmations) {
        const ret = wasm.rlnwasmwallet_sendBegin(this.__wbg_ptr, online_js, recipient_map_js, donation, fee_rate, min_confirmations);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} address
     * @param {bigint} amount
     * @param {bigint} fee_rate
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    sendBtcBegin(online_js, address, amount, fee_rate, skip_sync) {
        const ptr0 = passStringToWasm0(address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_sendBtcBegin(this.__wbg_ptr, online_js, ptr0, len0, amount, fee_rate, skip_sync);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} signed_psbt
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    sendBtcEnd(online_js, signed_psbt, skip_sync) {
        const ptr0 = passStringToWasm0(signed_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_sendBtcEnd(this.__wbg_ptr, online_js, ptr0, len0, skip_sync);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} signed_psbt
     * @param {boolean} skip_sync
     * @returns {Promise<string>}
     */
    sendEndJson(online_js, signed_psbt, skip_sync) {
        const ptr0 = passStringToWasm0(signed_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_sendEndJson(this.__wbg_ptr, online_js, ptr0, len0, skip_sync);
        return ret;
    }
    /**
     * @param {any} online_js
     * @param {string} signed_psbt
     * @param {boolean} skip_sync
     * @returns {Promise<any>}
     */
    sendEndValue(online_js, signed_psbt, skip_sync) {
        const ptr0 = passStringToWasm0(signed_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_sendEndValue(this.__wbg_ptr, online_js, ptr0, len0, skip_sync);
        return ret;
    }
    /**
     * @param {any} request_js
     * @returns {Promise<string>}
     */
    sendRgbFromGroupsJson(request_js) {
        const ret = wasm.rlnwasmwallet_sendRgbFromGroupsJson(this.__wbg_ptr, request_js);
        return ret;
    }
    /**
     * @param {any} request_js
     * @returns {Promise<any>}
     */
    sendRgbFromGroupsValue(request_js) {
        const ret = wasm.rlnwasmwallet_sendRgbFromGroupsValue(this.__wbg_ptr, request_js);
        return ret;
    }
    /**
     * @param {string} endpoint
     * @param {string | null} [auth_token]
     * @param {string | null} [node_id]
     */
    setRgbProxyTransport(endpoint, auth_token, node_id) {
        const ptr0 = passStringToWasm0(endpoint, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(auth_token) ? 0 : passStringToWasm0(auth_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(node_id) ? 0 : passStringToWasm0(node_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_setRgbProxyTransport(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} unsigned_psbt
     * @returns {string}
     */
    signPsbtJson(unsigned_psbt) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(unsigned_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmwallet_signPsbtJson(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} unsigned_psbt
     * @returns {string}
     */
    signPsbtValue(unsigned_psbt) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(unsigned_psbt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmwallet_signPsbtValue(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {any} online_js
     * @returns {Promise<void>}
     */
    syncOnline(online_js) {
        const ret = wasm.rlnwasmwallet_syncOnline(this.__wbg_ptr, online_js);
        return ret;
    }
    /**
     * @returns {Promise<string>}
     */
    vssBackupInfoJson() {
        const ret = wasm.rlnwasmwallet_vssBackupInfoJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    vssBackupInfoValue() {
        const ret = wasm.rlnwasmwallet_vssBackupInfoValue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<string>}
     */
    vssBackupJson() {
        const ret = wasm.rlnwasmwallet_vssBackupJson(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    vssBackupValue() {
        const ret = wasm.rlnwasmwallet_vssBackupValue(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<void>}
     */
    vssRestoreBackup() {
        const ret = wasm.rlnwasmwallet_vssRestoreBackup(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string | null | undefined} asset_id
     * @param {any} assignment_js
     * @param {number | null | undefined} duration_seconds
     * @param {any} transport_endpoints_js
     * @param {number} min_confirmations
     * @returns {string}
     */
    witnessReceiveJson(asset_id, assignment_js, duration_seconds, transport_endpoints_js, min_confirmations) {
        let deferred3_0;
        let deferred3_1;
        try {
            var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            const ret = wasm.rlnwasmwallet_witnessReceiveJson(this.__wbg_ptr, ptr0, len0, assignment_js, isLikeNone(duration_seconds) ? 0x100000001 : (duration_seconds) >>> 0, transport_endpoints_js, min_confirmations);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string | null | undefined} asset_id
     * @param {any} assignment_js
     * @param {number | null | undefined} duration_seconds
     * @param {any} transport_endpoints_js
     * @param {number} min_confirmations
     * @returns {any}
     */
    witnessReceiveValue(asset_id, assignment_js, duration_seconds, transport_endpoints_js, min_confirmations) {
        var ptr0 = isLikeNone(asset_id) ? 0 : passStringToWasm0(asset_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.rlnwasmwallet_witnessReceiveValue(this.__wbg_ptr, ptr0, len0, assignment_js, isLikeNone(duration_seconds) ? 0x100000001 : (duration_seconds) >>> 0, transport_endpoints_js, min_confirmations);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}
if (Symbol.dispose) RlnWasmWallet.prototype[Symbol.dispose] = RlnWasmWallet.prototype.free;

/**
 * @param {string} network
 * @param {string} indexer_url
 * @returns {string}
 */
export function checkIndexerUrlJson(network, indexer_url) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.checkIndexerUrlJson(ptr0, len0, ptr1, len1);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * @param {string} network
 * @param {string} indexer_url
 * @returns {any}
 */
export function checkIndexerUrlValue(network, indexer_url) {
    const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(indexer_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.checkIndexerUrlValue(ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {string} proxy_url
 * @param {string} peer_addr
 * @returns {Promise<string>}
 */
export function checkLnPeerWebsocketJson(proxy_url, peer_addr) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.checkLnPeerWebsocketJson(ptr0, len0, ptr1, len1);
    return ret;
}

/**
 * @param {string} proxy_url
 * @param {string} peer_addr
 * @returns {Promise<any>}
 */
export function checkLnPeerWebsocketValue(proxy_url, peer_addr) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.checkLnPeerWebsocketValue(ptr0, len0, ptr1, len1);
    return ret;
}

/**
 * @param {string} proxy_url
 * @returns {Promise<void>}
 */
export function checkProxyUrl(proxy_url) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.checkProxyUrl(ptr0, len0);
    return ret;
}

export function clearPeerManagerHooks() {
    wasm.clearPeerManagerHooks();
}

/**
 * @returns {boolean}
 */
export function hasPeerManagerHooks() {
    const ret = wasm.hasPeerManagerHooks();
    return ret !== 0;
}

/**
 * @returns {boolean}
 */
export function hasPeerManagerHooksV2() {
    const ret = wasm.hasPeerManagerHooksV2();
    return ret !== 0;
}

/**
 * @param {Function} new_outbound_connection_cb
 * @param {Function} read_event_cb
 * @param {Function} process_events_cb
 * @param {Function} socket_disconnected_cb
 * @param {Function} report_error_cb
 */
export function installPeerManagerHooksFromJs(new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb, report_error_cb) {
    wasm.installPeerManagerHooksFromJs(new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb, report_error_cb);
}

/**
 * @param {Function} new_outbound_connection_cb
 * @param {Function} read_event_cb
 * @param {Function} process_events_cb
 * @param {Function} take_outbound_frames_cb
 * @param {Function} socket_disconnected_cb
 * @param {Function} report_error_cb
 */
export function installPeerManagerHooksFromJsV2(new_outbound_connection_cb, read_event_cb, process_events_cb, take_outbound_frames_cb, socket_disconnected_cb, report_error_cb) {
    wasm.installPeerManagerHooksFromJsV2(new_outbound_connection_cb, read_event_cb, process_events_cb, take_outbound_frames_cb, socket_disconnected_cb, report_error_cb);
}

/**
 * @param {string} proxy_url
 * @param {string} peer_addr
 * @returns {Promise<RlnWasmLnSocket>}
 */
export function lnSocketConnect(proxy_url, peer_addr) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.lnSocketConnect(ptr0, len0, ptr1, len1);
    return ret;
}

/**
 * @param {string} proxy_url
 * @param {string} peer_addr
 * @param {any} options_js
 * @returns {Promise<RlnWasmLnSocket>}
 */
export function lnSocketConnectWithOptions(proxy_url, peer_addr, options_js) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.lnSocketConnectWithOptions(ptr0, len0, ptr1, len1, options_js);
    return ret;
}

/**
 * @param {string} proxy_url
 * @param {string} peer_addr
 * @param {string} peer_pubkey
 * @param {Function} new_outbound_connection_cb
 * @param {Function} read_event_cb
 * @param {Function} process_events_cb
 * @param {Function} socket_disconnected_cb
 * @returns {Promise<RlnWasmPeerSession>}
 */
export function peerSessionConnect(proxy_url, peer_addr, peer_pubkey, new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.peerSessionConnect(ptr0, len0, ptr1, len1, ptr2, len2, new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb);
    return ret;
}

/**
 * @param {string} proxy_url
 * @param {string} peer_addr
 * @param {string} peer_pubkey
 * @param {Function} new_outbound_connection_cb
 * @param {Function} read_event_cb
 * @param {Function} process_events_cb
 * @param {Function} socket_disconnected_cb
 * @param {Function} report_error_cb
 * @returns {Promise<RlnWasmPeerSession>}
 */
export function peerSessionConnectWithErrorCb(proxy_url, peer_addr, peer_pubkey, new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb, report_error_cb) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.peerSessionConnectWithErrorCb(ptr0, len0, ptr1, len1, ptr2, len2, new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb, report_error_cb);
    return ret;
}

/**
 * @param {string} proxy_url
 * @param {string} peer_addr
 * @param {string} peer_pubkey
 * @param {any} options_js
 * @param {Function} new_outbound_connection_cb
 * @param {Function} read_event_cb
 * @param {Function} process_events_cb
 * @param {Function} socket_disconnected_cb
 * @returns {Promise<RlnWasmPeerSession>}
 */
export function peerSessionConnectWithOptions(proxy_url, peer_addr, peer_pubkey, options_js, new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.peerSessionConnectWithOptions(ptr0, len0, ptr1, len1, ptr2, len2, options_js, new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb);
    return ret;
}

/**
 * @param {string} proxy_url
 * @param {string} peer_addr
 * @param {string} peer_pubkey
 * @param {any} options_js
 * @param {Function} new_outbound_connection_cb
 * @param {Function} read_event_cb
 * @param {Function} process_events_cb
 * @param {Function} socket_disconnected_cb
 * @param {Function} report_error_cb
 * @returns {Promise<RlnWasmPeerSession>}
 */
export function peerSessionConnectWithOptionsAndErrorCb(proxy_url, peer_addr, peer_pubkey, options_js, new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb, report_error_cb) {
    const ptr0 = passStringToWasm0(proxy_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(peer_addr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(peer_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.peerSessionConnectWithOptionsAndErrorCb(ptr0, len0, ptr1, len1, ptr2, len2, options_js, new_outbound_connection_cb, read_event_cb, process_events_cb, socket_disconnected_cb, report_error_cb);
    return ret;
}

/**
 * @param {string} network
 * @returns {string}
 */
export function rgbGenerateKeysJson(network) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rgbGenerateKeysJson(ptr0, len0);
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @param {string} network
 * @returns {any}
 */
export function rgbGenerateKeysValue(network) {
    const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbGenerateKeysValue(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {string} network
 * @param {string} mnemonic
 * @returns {string}
 */
export function rgbRestoreKeysJson(network, mnemonic) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(mnemonic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.rgbRestoreKeysJson(ptr0, len0, ptr1, len1);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * @param {string} network
 * @param {string} mnemonic
 * @returns {any}
 */
export function rgbRestoreKeysValue(network, mnemonic) {
    const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(mnemonic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.rgbRestoreKeysValue(ptr0, len0, ptr1, len1);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

export function wasm_init() {
    wasm.wasm_init();
}
import * as import1 from "./snippets/rln-wasm-sdk-a6a7423038354311/inline1.js"

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_2e59b1b37a9a34c3: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_Number_e6ffdb596c888833: function(arg0) {
            const ret = Number(arg0);
            return ret;
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___rln_runtime_idb_delete_02494b1f9680534c: function(arg0, arg1) {
            const ret = __rln_runtime_idb_delete(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___rln_runtime_idb_set_e2efb9183f63d580: function(arg0, arg1, arg2, arg3) {
            const ret = __rln_runtime_idb_set(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
            return ret;
        },
        __wbg___rln_vss_acquire_lock_40e95e3ec7b37b4b: function(arg0, arg1) {
            const ret = __rln_vss_acquire_lock(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___rln_vss_release_lock_1040ed72c698c80a: function(arg0, arg1) {
            __rln_vss_release_lock(getStringFromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_bigint_get_as_i64_2c5082002e4826e2: function(arg0, arg1) {
            const v = arg1;
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_a86c216575a75c30: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_dd5d2d07ce9e6c57: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_4bd7a57e54337366: function(arg0, arg1) {
            const ret = arg0 in arg1;
            return ret;
        },
        __wbg___wbindgen_is_bigint_6c98f7e945dacdde: function(arg0) {
            const ret = typeof(arg0) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_49868bde5eb1e745: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_344c8750a8525473: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_object_40c5a80572e8f9d3: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_b29b5c5a8065ba1a: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_c0cca72b82b86f4d: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_7d430e744a913d26: function(arg0, arg1) {
            const ret = arg0 === arg1;
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_3a72ae764d46d944: function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        },
        __wbg___wbindgen_number_get_7579aab02a8a620c: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_914df97fcfa788f2: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_81fc77679af83bc6: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_3c3b4f651835fbcb: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_abort_5ee4083ce26e0b01: function(arg0) {
            arg0.abort();
        },
        __wbg_abort_7a67cb8f9383baa1: function(arg0, arg1) {
            arg0.abort(arg1);
        },
        __wbg_addEventListener_4696109b6f15c412: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.addEventListener(getStringFromWasm0(arg1, arg2), arg3, arg4);
        }, arguments); },
        __wbg_addEventListener_83ef16da0995f634: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            arg0.addEventListener(getStringFromWasm0(arg1, arg2), arg3);
        }, arguments); },
        __wbg_append_4aa39f0c1ef8161e: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_append_59da1e75d76c3126: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.append(getStringFromWasm0(arg1, arg2), arg3, getStringFromWasm0(arg4, arg5));
        }, arguments); },
        __wbg_append_c015600138ae60bb: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_arrayBuffer_dae084a298aa5fe0: function() { return handleError(function (arg0) {
            const ret = arg0.arrayBuffer();
            return ret;
        }, arguments); },
        __wbg_call_7f2987183bb62793: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_call_d578befcc3145dee: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_clearTimeout_1ccca1faf41fc6f8: function(arg0) {
            const ret = clearTimeout(arg0);
            return ret;
        },
        __wbg_clearTimeout_6b8d9a38b9263d65: function(arg0) {
            const ret = clearTimeout(arg0);
            return ret;
        },
        __wbg_close_040c0e5be6c74f11: function(arg0) {
            arg0.close();
        },
        __wbg_close_f181fdc02ee236e6: function() { return handleError(function (arg0) {
            arg0.close();
        }, arguments); },
        __wbg_code_c96efa5c1a80b2d9: function(arg0) {
            const ret = arg0.code;
            return ret;
        },
        __wbg_createIndex_3b7d978a2177a0cf: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            const ret = arg0.createIndex(getStringFromWasm0(arg1, arg2), arg3, arg4);
            return ret;
        }, arguments); },
        __wbg_createObjectStore_6e567b25160be2fa: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.createObjectStore(getStringFromWasm0(arg1, arg2), arg3);
            return ret;
        }, arguments); },
        __wbg_crypto_38df2bab126b63dc: function(arg0) {
            const ret = arg0.crypto;
            return ret;
        },
        __wbg_data_60b50110c5bd9349: function(arg0) {
            const ret = arg0.data;
            return ret;
        },
        __wbg_deleteIndex_af52038711dd78b2: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.deleteIndex(getStringFromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_deleteObjectStore_42c1e82fe6d8a028: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.deleteObjectStore(getStringFromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_dispatchEvent_7be0dc433e312ebc: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.dispatchEvent(arg1);
            return ret;
        }, arguments); },
        __wbg_done_547d467e97529006: function(arg0) {
            const ret = arg0.done;
            return ret;
        },
        __wbg_entries_616b1a459b85be0b: function(arg0) {
            const ret = Object.entries(arg0);
            return ret;
        },
        __wbg_entries_69f235654ec4ccc6: function(arg0) {
            const ret = arg0.entries();
            return ret;
        },
        __wbg_error_38bec0a78dd8ded8: function(arg0) {
            console.error(arg0);
        },
        __wbg_error_58469b8474e13592: function() { return handleError(function (arg0) {
            const ret = arg0.error;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_error_c57846662bf0e748: function(arg0) {
            const ret = arg0.error;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_fetch_0e70fe3bd20ee8c4: function(arg0, arg1) {
            const ret = arg0.fetch(arg1);
            return ret;
        },
        __wbg_fetch_1a731e18c5e21884: function(arg0, arg1) {
            const ret = arg0.fetch(arg1);
            return ret;
        },
        __wbg_fetch_8d9b732df7467c44: function(arg0) {
            const ret = fetch(arg0);
            return ret;
        },
        __wbg_fetch_9dad4fe911207b37: function(arg0) {
            const ret = fetch(arg0);
            return ret;
        },
        __wbg_fetch_c6486a0142348bc8: function(arg0) {
            const ret = fetch(arg0);
            return ret;
        },
        __wbg_from_741da0f916ab74aa: function(arg0) {
            const ret = Array.from(arg0);
            return ret;
        },
        __wbg_getItem_203869d4a1ba1433: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg1.getItem(getStringFromWasm0(arg2, arg3));
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_getRandomValues_3f44b700395062e5: function() { return handleError(function (arg0, arg1) {
            globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_getRandomValues_c44a50d8cfdaebeb: function() { return handleError(function (arg0, arg1) {
            arg0.getRandomValues(arg1);
        }, arguments); },
        __wbg_getTime_f6ac312467f7cf09: function(arg0) {
            const ret = arg0.getTime();
            return ret;
        },
        __wbg_get_4848e350b40afc16: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_560cb483e5c0133e: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.get(arg1);
            return ret;
        }, arguments); },
        __wbg_get_dba5fa38b6597b3f: function(arg0, arg1, arg2) {
            const ret = arg1[arg2 >>> 0];
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_get_ed0642c4b9d31ddf: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_f96702c6245e4ef9: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_unchecked_7d7babe32e9e6a54: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_with_ref_key_6412cf3094599694: function(arg0, arg1) {
            const ret = arg0[arg1];
            return ret;
        },
        __wbg_has_3ec5c22db2e5237a: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_headers_e08dcb5aa09b9a63: function(arg0) {
            const ret = arg0.headers;
            return ret;
        },
        __wbg_indexNames_82c4167bffa4c333: function(arg0) {
            const ret = arg0.indexNames;
            return ret;
        },
        __wbg_index_ce5a38731ba42f0d: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.index(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_instanceof_ArrayBuffer_ff7c1337a5e3b33a: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Error_e3390d6805733dad: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Error;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbDatabase_0af111edb4be95f4: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBDatabase;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbFactory_7c303c3d8528cef3: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBFactory;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbOpenDbRequest_92df356941adf31e: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBOpenDBRequest;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbRequest_fc5918c726448f04: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBRequest;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_IdbTransaction_de69712ce07dde97: function(arg0) {
            let result;
            try {
                result = arg0 instanceof IDBTransaction;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Map_a10a2795ef4bfe97: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Map;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Response_06795eab66cc4036: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Response;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_4b8da683deb25d72: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_c0fee4c064502536: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_WorkerGlobalScope_2b48dbfbe7327543: function(arg0) {
            let result;
            try {
                result = arg0 instanceof WorkerGlobalScope;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_db61795ad004c139: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_isSafeInteger_ea83862ba994770c: function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        },
        __wbg_iterator_de403ef31815a3e6: function() {
            const ret = Symbol.iterator;
            return ret;
        },
        __wbg_keyPath_137bba25d08d22b9: function() { return handleError(function (arg0) {
            const ret = arg0.keyPath;
            return ret;
        }, arguments); },
        __wbg_key_16e077716098efa2: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg1.key(arg2 >>> 0);
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments); },
        __wbg_length_0c32cb8543c8e4c8: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_3804262ff442a7a3: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_4faa35c260c02d3a: function() { return handleError(function (arg0) {
            const ret = arg0.length;
            return ret;
        }, arguments); },
        __wbg_length_6e821edde497a532: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_localStorage_b1a71e6b7afdce21: function() { return handleError(function (arg0) {
            const ret = arg0.localStorage;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_log_4c0baeb8af2f8f89: function(arg0) {
            console.log(arg0);
        },
        __wbg_message_7367f8c7d0fa1589: function(arg0) {
            const ret = arg0.message;
            return ret;
        },
        __wbg_msCrypto_bd5a034af96bcba6: function(arg0) {
            const ret = arg0.msCrypto;
            return ret;
        },
        __wbg_multiEntry_9d4ec9fa9fa5a9d5: function(arg0) {
            const ret = arg0.multiEntry;
            return ret;
        },
        __wbg_name_cb583806cac84fe0: function(arg0) {
            const ret = arg0.name;
            return ret;
        },
        __wbg_new_0_bfa2ef4bc447daa2: function() {
            const ret = new Date();
            return ret;
        },
        __wbg_new_0fec9fb02d03a383: function() { return handleError(function (arg0, arg1) {
            const ret = new URL(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_new_3a112826a89cb962: function() { return handleError(function () {
            const ret = new Headers();
            return ret;
        }, arguments); },
        __wbg_new_40792555590ec35c: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_4f9fafbb3909af72: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_56a7f7f78a9437aa: function() { return handleError(function () {
            const ret = new FormData();
            return ret;
        }, arguments); },
        __wbg_new_7681c4155808e30a: function() { return handleError(function () {
            const ret = new URLSearchParams();
            return ret;
        }, arguments); },
        __wbg_new_99cabae501c0a8a0: function() {
            const ret = new Map();
            return ret;
        },
        __wbg_new_9abbf7148481485e: function() { return handleError(function () {
            const ret = new AbortController();
            return ret;
        }, arguments); },
        __wbg_new_a2d8434834334bbf: function() { return handleError(function (arg0, arg1) {
            const ret = new WebSocket(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_new_a560378ea1240b14: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_new_f3c9df4f38f3f798: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_from_slice_2580ff33d0d10520: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_typed_14d7cc391ce53d2c: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_with_args_1ebc2047cd58dcbf: function(arg0, arg1, arg2, arg3) {
            const ret = new Function(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
            return ret;
        },
        __wbg_new_with_event_init_dict_90cf1fb15e06f148: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new CloseEvent(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments); },
        __wbg_new_with_length_9cedd08484b73942: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return ret;
        },
        __wbg_new_with_str_9dca18ad543fe832: function() { return handleError(function (arg0, arg1) {
            const ret = new Request(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_new_with_str_and_init_f663b6d334baa878: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments); },
        __wbg_new_with_u8_array_sequence_2ae9f5628c4df63c: function() { return handleError(function (arg0) {
            const ret = new Blob(arg0);
            return ret;
        }, arguments); },
        __wbg_next_01132ed6134b8ef5: function(arg0) {
            const ret = arg0.next;
            return ret;
        },
        __wbg_next_b3713ec761a9dbfd: function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments); },
        __wbg_node_84ea875411254db1: function(arg0) {
            const ret = arg0.node;
            return ret;
        },
        __wbg_now_88621c9c9a4f3ffc: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_now_e7c6795a7f81e10f: function(arg0) {
            const ret = arg0.now();
            return ret;
        },
        __wbg_objectStoreNames_990d8e55c661828b: function(arg0) {
            const ret = arg0.objectStoreNames;
            return ret;
        },
        __wbg_objectStore_3d4cade4416cd432: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.objectStore(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_ok_36f7b13b74596c24: function(arg0) {
            const ret = arg0.ok;
            return ret;
        },
        __wbg_open_254d9b392262d9ef: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.open(getStringFromWasm0(arg1, arg2));
            return ret;
        }, arguments); },
        __wbg_open_ac04ec9d75d0eeaf: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.open(getStringFromWasm0(arg1, arg2), arg3 >>> 0);
            return ret;
        }, arguments); },
        __wbg_performance_3fcf6e32a7e1ed0a: function(arg0) {
            const ret = arg0.performance;
            return ret;
        },
        __wbg_process_44c7a14e11e9f69e: function(arg0) {
            const ret = arg0.process;
            return ret;
        },
        __wbg_prototypesetcall_3e05eb9545565046: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_push_6bdbc990be5ac37b: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_put_015a7e88e46a2502: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.put(arg1);
            return ret;
        }, arguments); },
        __wbg_put_4485a4012273f7ef: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.put(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_queueMicrotask_abaf92f0bd4e80a4: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_df5a6dac26d818f3: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_randomFillSync_6c25eac9869eb53c: function() { return handleError(function (arg0, arg1) {
            arg0.randomFillSync(arg1);
        }, arguments); },
        __wbg_readyState_631d9f7c37e595d7: function(arg0) {
            const ret = arg0.readyState;
            return ret;
        },
        __wbg_reason_85e58391371e868d: function(arg0, arg1) {
            const ret = arg1.reason;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_removeEventListener_e5033ab3bcad443c: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            arg0.removeEventListener(getStringFromWasm0(arg1, arg2), arg3);
        }, arguments); },
        __wbg_removeItem_edd5e09fd7345519: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.removeItem(getStringFromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_require_b4edbdcf3e2a1ef0: function() { return handleError(function () {
            const ret = module.require;
            return ret;
        }, arguments); },
        __wbg_resolve_0a79de24e9d2267b: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_result_452c1006fc727317: function() { return handleError(function (arg0) {
            const ret = arg0.result;
            return ret;
        }, arguments); },
        __wbg_rlnwasmlnsocket_new: function(arg0) {
            const ret = RlnWasmLnSocket.__wrap(arg0);
            return ret;
        },
        __wbg_rlnwasmpeersession_new: function(arg0) {
            const ret = RlnWasmPeerSession.__wrap(arg0);
            return ret;
        },
        __wbg_rlnwasmsdkwallethandle_new: function(arg0) {
            const ret = RlnWasmSdkWalletHandle.__wrap(arg0);
            return ret;
        },
        __wbg_rlnwasmwallet_new: function(arg0) {
            const ret = RlnWasmWallet.__wrap(arg0);
            return ret;
        },
        __wbg_search_bd3fc2fcfcfc32a2: function(arg0, arg1) {
            const ret = arg1.search;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_send_4f53c94146f0274d: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.send(getStringFromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_send_64dd480ad0d86a31: function() { return handleError(function (arg0, arg1, arg2) {
            arg0.send(getArrayU8FromWasm0(arg1, arg2));
        }, arguments); },
        __wbg_setItem_67573afec8996fe4: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.setItem(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_setTimeout_30be5552e4410378: function(arg0, arg1) {
            const ret = setTimeout(arg0, arg1);
            return ret;
        },
        __wbg_setTimeout_553bc247bec3e16e: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setTimeout(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_setTimeout_f757f00851f76c42: function(arg0, arg1) {
            const ret = setTimeout(arg0, arg1);
            return ret;
        },
        __wbg_set_08463b1df38a7e29: function(arg0, arg1, arg2) {
            const ret = arg0.set(arg1, arg2);
            return ret;
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_set_6c60b2e8ad0e9383: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_8ee2d34facb8466e: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_aa391f3af1ff0e9c: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments); },
        __wbg_set_auto_increment_37227907cc70bd30: function(arg0, arg1) {
            arg0.autoIncrement = arg1 !== 0;
        },
        __wbg_set_binaryType_95c0a0f7586a3903: function(arg0, arg1) {
            arg0.binaryType = __wbindgen_enum_BinaryType[arg1];
        },
        __wbg_set_body_a304d09cb50cefbe: function(arg0, arg1) {
            arg0.body = arg1;
        },
        __wbg_set_cache_cc687e2b96e9608c: function(arg0, arg1) {
            arg0.cache = __wbindgen_enum_RequestCache[arg1];
        },
        __wbg_set_code_602fbf0ab3cb39f3: function(arg0, arg1) {
            arg0.code = arg1;
        },
        __wbg_set_credentials_7693e63055f5e838: function(arg0, arg1) {
            arg0.credentials = __wbindgen_enum_RequestCredentials[arg1];
        },
        __wbg_set_headers_6ab1105e542834e2: function(arg0, arg1) {
            arg0.headers = arg1;
        },
        __wbg_set_key_path_6edd6ee0e8d75af3: function(arg0, arg1) {
            arg0.keyPath = arg1;
        },
        __wbg_set_method_1971272fe557e972: function(arg0, arg1, arg2) {
            arg0.method = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_mode_d1b643087602281a: function(arg0, arg1) {
            arg0.mode = __wbindgen_enum_RequestMode[arg1];
        },
        __wbg_set_multi_entry_791aace5b9c7b692: function(arg0, arg1) {
            arg0.multiEntry = arg1 !== 0;
        },
        __wbg_set_name_87619993a0cec565: function(arg0, arg1, arg2) {
            arg0.name = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_onabort_6b6df7a41aa97c23: function(arg0, arg1) {
            arg0.onabort = arg1;
        },
        __wbg_set_once_21b4f52a7651545b: function(arg0, arg1) {
            arg0.once = arg1 !== 0;
        },
        __wbg_set_oncomplete_20fb27150b4ee0d4: function(arg0, arg1) {
            arg0.oncomplete = arg1;
        },
        __wbg_set_onerror_2b7dfa4e6dea4159: function(arg0, arg1) {
            arg0.onerror = arg1;
        },
        __wbg_set_onerror_3c4b5087146b11b6: function(arg0, arg1) {
            arg0.onerror = arg1;
        },
        __wbg_set_onsuccess_f7e5b5cbed5008b1: function(arg0, arg1) {
            arg0.onsuccess = arg1;
        },
        __wbg_set_onupgradeneeded_d7e8e03a1999bf5d: function(arg0, arg1) {
            arg0.onupgradeneeded = arg1;
        },
        __wbg_set_onversionchange_f7822a34e73e2769: function(arg0, arg1) {
            arg0.onversionchange = arg1;
        },
        __wbg_set_reason_bdf8bb55943f05b9: function(arg0, arg1, arg2) {
            arg0.reason = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_search_527da9642b10495d: function(arg0, arg1, arg2) {
            arg0.search = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_signal_8564a226c5c6853c: function(arg0, arg1) {
            arg0.signal = arg1;
        },
        __wbg_set_unique_e8b9acd5c7c23d7a: function(arg0, arg1) {
            arg0.unique = arg1 !== 0;
        },
        __wbg_signal_9172c3282bfba2f5: function(arg0) {
            const ret = arg0.signal;
            return ret;
        },
        __wbg_slice_21f4c5261d1fdd69: function(arg0, arg1) {
            const ret = arg1.slice();
            const ptr1 = passArrayJsValueToWasm0(ret, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_THIS_a1248013d790bf5f: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_f2e0f995a21329ff: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_24f78b6d23f286ea: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_59fd959c540fe405: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_status_44ecb0ac1da253f4: function(arg0) {
            const ret = arg0.status;
            return ret;
        },
        __wbg_stringify_a2c39d991e1bf91d: function() { return handleError(function (arg0) {
            const ret = JSON.stringify(arg0);
            return ret;
        }, arguments); },
        __wbg_subarray_0f98d3fb634508ad: function(arg0, arg1, arg2) {
            const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_target_732d56b173b7e87c: function(arg0) {
            const ret = arg0.target;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_text_43bdfba45e602cf9: function() { return handleError(function (arg0) {
            const ret = arg0.text();
            return ret;
        }, arguments); },
        __wbg_then_00eed3ac0b8e82cb: function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        },
        __wbg_then_a0c8db0381c8994c: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbg_toString_6bb93e4c281b55a5: function(arg0) {
            const ret = arg0.toString();
            return ret;
        },
        __wbg_toString_891d991e862e1d44: function(arg0) {
            const ret = arg0.toString();
            return ret;
        },
        __wbg_transaction_904b9a3920efb0b5: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.transaction(arg1, __wbindgen_enum_IdbTransactionMode[arg2]);
            return ret;
        }, arguments); },
        __wbg_transaction_9c41d998bb80d12a: function(arg0) {
            const ret = arg0.transaction;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_unique_ae0d9cc0f38a6784: function(arg0) {
            const ret = arg0.unique;
            return ret;
        },
        __wbg_url_95d8a83d33709572: function(arg0, arg1) {
            const ret = arg1.url;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_url_fa6a0c3c3dd41ac6: function(arg0, arg1) {
            const ret = arg1.url;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_value_7f6052747ccf940f: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbg_versions_276b2795b1c6a219: function(arg0) {
            const ret = arg0.versions;
            return ret;
        },
        __wbg_warn_2b0a27f629a4bb1e: function(arg0) {
            console.warn(arg0);
        },
        __wbg_wasClean_919e018e809fd9da: function(arg0) {
            const ret = arg0.wasClean;
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 1600, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___wasm_bindgen_ad9ab61505cf9ad2___JsValue______true_);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 5101, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___wasm_bindgen_ad9ab61505cf9ad2___JsValue__core_d941ad8722425d2e___result__Result_____wasm_bindgen_ad9ab61505cf9ad2___JsError___true_);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("CloseEvent")], shim_idx: 2420, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true_);
            return ret;
        },
        __wbindgen_cast_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("Event")], shim_idx: 2420, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true__3);
            return ret;
        },
        __wbindgen_cast_0000000000000005: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("Event")], shim_idx: 3537, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_Event__Event______true_);
            return ret;
        },
        __wbindgen_cast_0000000000000006: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("IDBVersionChangeEvent")], shim_idx: 3146, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_IdbVersionChangeEvent__IdbVersionChangeEvent______true_);
            return ret;
        },
        __wbindgen_cast_0000000000000007: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [NamedExternref("MessageEvent")], shim_idx: 2420, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true__6);
            return ret;
        },
        __wbindgen_cast_0000000000000008: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 2424, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true_);
            return ret;
        },
        __wbindgen_cast_0000000000000009: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 3329, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true__1_);
            return ret;
        },
        __wbindgen_cast_000000000000000a: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [], shim_idx: 3494, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true__2_);
            return ret;
        },
        __wbindgen_cast_000000000000000b: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_000000000000000c: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_000000000000000d: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_000000000000000e: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_000000000000000f: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./rln_wasm_sdk_bg.js": import0,
        "./snippets/rln-wasm-sdk-a6a7423038354311/inline1.js": import1,
    };
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true_(arg0, arg1) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true_(arg0, arg1);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true__1_(arg0, arg1) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true__1_(arg0, arg1);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true__2_(arg0, arg1) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke_______true__2_(arg0, arg1);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___wasm_bindgen_ad9ab61505cf9ad2___JsValue______true_(arg0, arg1, arg2) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___wasm_bindgen_ad9ab61505cf9ad2___JsValue______true_(arg0, arg1, arg2);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true_(arg0, arg1, arg2) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true_(arg0, arg1, arg2);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true__3(arg0, arg1, arg2) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true__3(arg0, arg1, arg2);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_Event__Event______true_(arg0, arg1, arg2) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_Event__Event______true_(arg0, arg1, arg2);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_IdbVersionChangeEvent__IdbVersionChangeEvent______true_(arg0, arg1, arg2) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_IdbVersionChangeEvent__IdbVersionChangeEvent______true_(arg0, arg1, arg2);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true__6(arg0, arg1, arg2) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___web_sys_96216c2d2099b830___features__gen_CloseEvent__CloseEvent______true__6(arg0, arg1, arg2);
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___wasm_bindgen_ad9ab61505cf9ad2___JsValue__core_d941ad8722425d2e___result__Result_____wasm_bindgen_ad9ab61505cf9ad2___JsError___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___wasm_bindgen_ad9ab61505cf9ad2___JsValue__core_d941ad8722425d2e___result__Result_____wasm_bindgen_ad9ab61505cf9ad2___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen_ad9ab61505cf9ad2___convert__closures_____invoke___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined___js_sys_ec3d278120b849bb___Function_fn_wasm_bindgen_ad9ab61505cf9ad2___JsValue_____wasm_bindgen_ad9ab61505cf9ad2___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_BinaryType = ["blob", "arraybuffer"];


const __wbindgen_enum_IdbTransactionMode = ["readonly", "readwrite", "versionchange", "readwriteflush", "cleanup"];


const __wbindgen_enum_RequestCache = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"];


const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];


const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];
const RlnWasmInvoiceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasminvoice_free(ptr >>> 0, 1));
const RlnWasmLnSocketFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasmlnsocket_free(ptr >>> 0, 1));
const RlnWasmNodeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasmnode_free(ptr >>> 0, 1));
const RlnWasmPeerSessionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasmpeersession_free(ptr >>> 0, 1));
const RlnWasmRustPeerManagerBridgeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasmrustpeermanagerbridge_free(ptr >>> 0, 1));
const RlnWasmSdkFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasmsdk_free(ptr >>> 0, 1));
const RlnWasmSdkNodeHandleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasmsdknodehandle_free(ptr >>> 0, 1));
const RlnWasmSdkWalletHandleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasmsdkwallethandle_free(ptr >>> 0, 1));
const RlnWasmWalletFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rlnwasmwallet_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('rln_wasm_sdk_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
