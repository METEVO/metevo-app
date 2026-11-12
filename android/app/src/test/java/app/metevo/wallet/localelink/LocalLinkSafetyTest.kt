package app.metevo.wallet.localelink

import org.junit.Assert.*
import org.junit.Test

class LocalLinkSafetyTest {
    @Test fun selectRejectsTruncatedCommands() {
        val aid = MetevoLocalLinkApduService.LOCAL_LINK_AID
        val valid = byteArrayOf(0, 0xA4.toByte(), 4, 0, aid.size.toByte()) + aid
        for (length in 0 until valid.size) {
            assertFalse(MetevoLocalLinkApduService.acceptsSelect(valid.copyOf(length)))
        }
        assertTrue(MetevoLocalLinkApduService.acceptsSelect(valid))
        assertTrue(MetevoLocalLinkApduService.acceptsSelect(valid + byteArrayOf(0)))
    }

    @Test fun backgroundClearsSessionAndRejectsLateWrites() {
        LocalLinkState.setForeground(true)
        assertTrue(LocalLinkState.armCredentials(ByteArray(240)))
        assertTrue(LocalLinkState.armInvoice(LocalLinkState.ServedInvoice("test", "invoice")))
        LocalLinkState.setForeground(false)
        assertNull(LocalLinkState.readCredentials())
        assertNull(LocalLinkState.servedInvoice.get())
        assertFalse(LocalLinkState.armCredentials(ByteArray(240)))
        assertFalse(LocalLinkState.armInvoice(LocalLinkState.ServedInvoice("late", "invoice")))
        LocalLinkState.setForeground(true)
        assertNull(LocalLinkState.readCredentials())
        assertFalse(LocalLinkState.armInvoice(LocalLinkState.ServedInvoice("old", "invoice")))
        LocalLinkState.setForeground(false)
    }
}
