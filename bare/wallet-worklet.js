/**
 * The METEVO wallet worklet: hosts the prepared wallet services inside a
 * Bare runtime on the mobile device.
 *
 * Protocol (JSON lines over BareKit IPC):
 *   app -> worklet: {"id":1,"method":"openWallet","params":{...}}\n
 *   worklet -> app: {"id":1,"ok":true,"result":{...}}\n
 *                   {"id":1,"ok":false,"error":"..."}\n
 *   worklet -> app: {"event":"progress","step":"...","message":"..."}\n
 *
 * The app owns SecureStore, biometrics and the provisioned device config
 * file; it sends the wallet configuration and the seed as command
 * parameters. They live in worklet memory only while the node runs.
 */
import {
  assertPayableInvoice,
  createMetevoWallet,
  createUsdmLightningInvoice,
  findAssetIdByTicker,
  getMetevoWalletStatus,
  getPaymentStatus,
  hasUsableChannelWith,
  refreshWalletTransfers,
  shutdownMetevoWallet,
} from './compiled/services/metevo/wallet.js'

const { IPC } = BareKit

// On Android a worklet abort takes the whole app process down with it.
// Never let an unexpected async failure reach the runtime's default abort:
// report it over IPC so the app can log it and surface it to the user.
function reportFatal(scope, cause) {
  const message = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)
  try {
    console.error(`[worklet] ${scope}: ${message}`)
  } catch {
    /* console may be unavailable late in shutdown */
  }
  try {
    IPC.write(JSON.stringify({ event: 'worklet-error', scope, message }) + '\n')
  } catch {
    /* IPC already closed - nothing more we can do */
  }
}

if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('uncaughtException', (cause) => reportFatal('uncaughtException', cause))
  process.on('unhandledRejection', (cause) => reportFatal('unhandledRejection', cause))
}

let wallet = null
let usdmAssetId = null

const CHANNEL_POLL_INTERVAL_MS = 2_000
const DEFAULT_CHANNEL_TIMEOUT_MS = 120_000

function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emitProgress(step, message) {
  IPC.write(JSON.stringify({ event: 'progress', step, message }) + '\n')
}

function requireOpenWallet() {
  if (wallet === null) {
    throw new Error('the wallet is not open')
  }
  return wallet
}

/**
 * The module's designed LSP flow: bootstrapLsp connects the peer, waits for
 * peer visibility and runs the APay provisioning against lspBaseUrl. Falls
 * back to a plain peer connect when the beta runtime lacks the method.
 */
async function bootstrapLspIfAvailable(account, peerUri) {
  if (typeof account.bootstrapLsp === 'function') {
    await account.bootstrapLsp({
      peerPubkeyAndAddr: peerUri,
      waitForPeerMs: 30_000,
      pollIntervalMs: 2_000,
    })
    return
  }
  if (typeof account.connectPeer === 'function') {
    await account.connectPeer(peerUri)
  }
}

async function openWallet({ mnemonic, walletConfig, lspPeerUri, channelTimeoutMs }) {
  emitProgress('opening-node', 'Opening…')
  wallet = await createMetevoWallet(mnemonic, walletConfig)
  usdmAssetId = await findAssetIdByTicker(wallet.account)

  emitProgress('connecting-lsp', 'Connecting to the METEVO LSP…')
  if (lspPeerUri) {
    await bootstrapLspIfAvailable(wallet.account, lspPeerUri)
  }
  await waitFor(CHANNEL_POLL_INTERVAL_MS)

  emitProgress('provisioning-channel', 'Opening your USDm channel…')
  // The LSP provisions channels on a cron, so the wait is best-effort:
  // timing out is not an error - the app keeps polling the wallet status.
  const deadline = Date.now() + (channelTimeoutMs ?? DEFAULT_CHANNEL_TIMEOUT_MS)
  let status = await getMetevoWalletStatus(wallet.account, usdmAssetId)
  while (!status.usdmChannelReady && Date.now() < deadline) {
    await waitFor(CHANNEL_POLL_INTERVAL_MS)
    status = await getMetevoWalletStatus(wallet.account, usdmAssetId)
  }
  emitProgress('ready', 'Wallet connected')
  return { channelReady: status.usdmChannelReady }
}

async function readStatus() {
  if (wallet === null) {
    return {
      nodePubkey: null,
      btcSpendableSat: 0,
      balanceUsdmBaseUnits: null,
      channelReady: false,
    }
  }
  const status = await getMetevoWalletStatus(wallet.account, usdmAssetId)
  return {
    nodePubkey: status.pubkey,
    btcSpendableSat: status.btcSpendableSat,
    balanceUsdmBaseUnits: status.usdmBaseUnits,
    channelReady: status.usdmChannelReady,
  }
}

async function submitPayment({ invoice }) {
  // Real-node boundary: a non-bolt11 proposal fails before sendPayment.
  assertPayableInvoice(invoice)
  const response = await requireOpenWallet().account.sendPayment({ invoice })
  const paymentHash = String(response?.payment_hash ?? response?.paymentHash ?? '')
  return { paymentHash: paymentHash.length > 0 ? paymentHash : null }
}

async function checkPayment({ paymentHash }) {
  return getPaymentStatus(requireOpenWallet().account, paymentHash)
}

async function refreshTransfers() {
  // The node needs periodic refreshTransfers calls to settle pending RGB
  // transfers; the settlement watcher in the app polls this handler.
  return refreshWalletTransfers(requireOpenWallet().account, usdmAssetId)
}

async function createUsdmInvoice({ amountBaseUnits }) {
  return createUsdmLightningInvoice(
    requireOpenWallet().account,
    usdmAssetId,
    amountBaseUnits ?? null,
  )
}

async function checkUsableChannelWith({ peerPubkey }) {
  return hasUsableChannelWith(requireOpenWallet().account, peerPubkey)
}

async function connectPeer({ peerUri }) {
  await requireOpenWallet().account.connectPeer(peerUri)
}

async function shutdown() {
  if (wallet !== null) {
    await shutdownMetevoWallet(wallet)
    wallet = null
  }
}

const handlers = {
  openWallet,
  readStatus,
  submitPayment,
  checkPayment,
  refreshTransfers,
  createUsdmInvoice,
  hasUsableChannelWith: checkUsableChannelWith,
  connectPeer,
  shutdown,
}

let receiveBuffer = ''

async function dispatchFrame(line) {
  let request
  try {
    request = JSON.parse(line)
  } catch {
    return
  }
  const handler = handlers[request.method]
  try {
    if (typeof handler !== 'function') {
      throw new Error(`unknown wallet method: ${String(request.method)}`)
    }
    const result = await handler(request.params ?? {})
    IPC.write(JSON.stringify({ id: request.id, ok: true, result }) + '\n')
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause)
    IPC.write(JSON.stringify({ id: request.id, ok: false, error }) + '\n')
  }
}

IPC.on('data', (chunk) => {
  receiveBuffer += Buffer.from(chunk).toString('utf8')
  let newlineIndex = receiveBuffer.indexOf('\n')
  while (newlineIndex !== -1) {
    const line = receiveBuffer.slice(0, newlineIndex)
    receiveBuffer = receiveBuffer.slice(newlineIndex + 1)
    if (line.length > 0) {
      void dispatchFrame(line)
    }
    newlineIndex = receiveBuffer.indexOf('\n')
  }
})
