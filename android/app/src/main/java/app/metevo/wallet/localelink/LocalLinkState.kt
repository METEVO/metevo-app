package app.metevo.wallet.localelink

import java.util.concurrent.atomic.AtomicReference

/**
 * State shared between the React bridge, the HCE service (the system
 * creates its instances itself) and the socket server threads.
 *
 * Holds only what the local link serves on the wire: the 240-byte NFC
 * credential frame and the invoice answer for the current session. It
 * never touches wallet seeds or node keys.
 */
object LocalLinkState {
    /** The 240-byte credential frame served over the private AID. */
    val credentialFrame = AtomicReference<ByteArray?>(null)

    /** The invoice answer served to the payer over the P2P socket. */
    data class ServedInvoice(val sessionId: String, val invoice: String)

    val servedInvoice = AtomicReference<ServedInvoice?>(null)

    fun clear() {
        credentialFrame.set(null)
        servedInvoice.set(null)
    }
}
