package app.metevo.wallet.contactnfc

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

/**
 * HCE service serving the shared contact frame over the METEVO contact AID
 * (F04D455445564F02). The reading phone selects the AID, then pulls the
 * frame with ISO 7816-4 READ BINARY. The frame layout is defined and tested
 * in src/services/metevo/contactNfc.ts; this service only serves bytes.
 */
class MetevoContactNfcApduService : HostApduService() {
    companion object {
        val CONTACT_AID: ByteArray = byteArrayOf(
            0xF0.toByte(), 0x4D.toByte(), 0x45.toByte(), 0x54.toByte(),
            0x45.toByte(), 0x56.toByte(), 0x4F.toByte(), 0x02.toByte(),
        )

        private const val INS_SELECT = 0xA4.toByte()
        private const val INS_READ_BINARY = 0xB0.toByte()

        private val STATUS_OK = byteArrayOf(0x90.toByte(), 0x00)
        private val STATUS_WRONG_LENGTH = byteArrayOf(0x6B.toByte(), 0x00)
        private val STATUS_NOT_SUPPORTED = byteArrayOf(0x6D.toByte(), 0x00)
        private val STATUS_NOTHING_SHARED = byteArrayOf(0x6A.toByte(), 0x82.toByte())
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
        if (commandApdu.size < 5) {
            return STATUS_NOT_SUPPORTED
        }
        val lc = commandApdu[4].toInt() and 0xFF
        val isContactAid = commandApdu.size >= 5 + lc &&
            lc == CONTACT_AID.size &&
            commandApdu.copyOfRange(5, 5 + lc).contentEquals(CONTACT_AID)
        if (!isContactAid) {
            return STATUS_NOT_SUPPORTED
        }
        // Selecting succeeds only while a contact is actually being shared.
        return if (ContactNfcState.sharedFrame.get() != null) STATUS_OK else STATUS_NOTHING_SHARED
    }

    private fun handleReadBinary(commandApdu: ByteArray): ByteArray {
        val frame = ContactNfcState.sharedFrame.get() ?: return STATUS_NOTHING_SHARED
        if (commandApdu.size < 5) {
            return STATUS_NOT_SUPPORTED
        }
        val offset = ((commandApdu[2].toInt() and 0xFF) shl 8) or (commandApdu[3].toInt() and 0xFF)
        val length = commandApdu[4].toInt() and 0xFF
        if (offset + length > frame.size) {
            return STATUS_WRONG_LENGTH
        }
        return frame.copyOfRange(offset, offset + length) + STATUS_OK
    }

    override fun onDeactivated(reason: Int) {
        // Keep sharing: another phone may tap next.
    }
}
