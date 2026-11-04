package app.metevo.wallet.contactnfc

import java.util.concurrent.atomic.AtomicReference

/**
 * The contact frame this phone is currently sharing, set from JS while the
 * share screen is open. Kept apart from LocalLinkState: ending a payment
 * session never clears a contact share, and the other way round.
 */
object ContactNfcState {
    val sharedFrame = AtomicReference<ByteArray?>(null)
}
