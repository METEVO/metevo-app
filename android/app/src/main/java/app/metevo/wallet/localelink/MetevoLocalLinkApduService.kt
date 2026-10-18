package app.metevo.wallet.localelink

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

/**
 * HCE service: emulates the receiver's "credentials tag". The payer's
 * reader selects the METEVO private AID (F04D455445564F01) and then pulls
 * the 240-byte credential frame with ISO 7816-4 READ BINARY commands.
 *
 * The frame layout is defined (and unit-tested) in
 * src/services/localelink/localLinkFrame.ts; this service only serves the
 * bytes it was given through LocalLinkState.
 */
class MetevoLocalLinkApduService : HostApduService() {
    companion object {
        /** METEVO local-link private AID (proprietary single-byte range). */
        val LOCAL_LINK_AID: ByteArray = byteArrayOf(
            0xF0.toByte(), 0x4D.toByte(), 0x45.toByte(), 0x54.toByte(),
            0x45.toByte(), 0x56.toByte(), 0x4F.toByte(), 0x01.toByte(),
        )

        private const val INS_SELECT = 0xA4.toByte()
        private const val INS_READ_BINARY = 0xB0.toByte()

        private val STATUS_OK = byteArrayOf(0x90.toByte(), 0x00)
        private val STATUS_WRONG_LENGTH = byteArrayOf(0x6B.toByte(), 0x00)
        private val STATUS_NOT_SUPPORTED = byteArrayOf(0x6D.toByte(), 0x00)
        private val STATUS_NOT_INITIALIZED = byteArrayOf(0x62.toByte(), 0x00)
    }

    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
        if (commandApdu == null || commandApdu.size < 4) {
            return STATUS_NOT_SUPPORTED
        }
        return when (commandApdu[1]) {
            INS_SELECT -> handleSelect(commandApdu)
            INS_READ_BINARY -> handleReadBinary(commandApdu)
            else -> STATUS_NOT_SUPPORTED
        }
    }

    private fun handleSelect(commandApdu: ByteArray): ByteArray {
        // Case 4 SELECT: 00 A4 04 00 Lc <AID..> Le
        val lc = commandApdu[4].toInt() and 0xFF
        val hasOurAid = commandApdu.size >= 5 + lc &&
            lc == LOCAL_LINK_AID.size &&
            commandApdu.copyOfRange(5, 5 + lc).contentEquals(LOCAL_LINK_AID)
        return if (hasOurAid) STATUS_OK else STATUS_NOT_SUPPORTED
    }

    private fun handleReadBinary(commandApdu: ByteArray): ByteArray {
        val frame = LocalLinkState.credentialFrame.get()
            ?: return STATUS_NOT_INITIALIZED
        if (commandApdu.size < 5) {
            return STATUS_NOT_SUPPORTED
        }
        val offset = ((commandApdu[2].toInt() and 0xFF) shl 8) or (commandApdu[3].toInt() and 0xFF)
        val length = commandApdu[4].toInt() and 0xFF
        if (offset + length > frame.size) {
            return STATUS_WRONG_LENGTH
        }
        val data = frame.copyOfRange(offset, offset + length)
        return data + STATUS_OK
    }

    override fun onDeactivated(reason: Int) {
        // Keep serving: the reader re-taps with a new SELECT.
    }
}
