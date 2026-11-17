package app.metevo.wallet.contactnfc

import java.util.concurrent.atomic.AtomicReference

/**
 * The contact frame this phone is currently sharing, set from JS while the
 * share screen is open. Kept apart from LocalLinkState: ending a payment
 * session never clears a contact share, and the other way round.
 */
object ContactNfcState {
    @Volatile private var foreground = false
    @Synchronized fun setForeground(active: Boolean) {
        foreground = active
        if (!active) sharedFrame.set(null)
    }
    @Synchronized fun arm(frame: ByteArray): Boolean {
        if (!foreground) return false
        sharedFrame.set(frame)
        return true
    }
    @Synchronized fun read(): ByteArray? = if (foreground) sharedFrame.get() else null
    val sharedFrame = AtomicReference<ByteArray?>(null)
}
