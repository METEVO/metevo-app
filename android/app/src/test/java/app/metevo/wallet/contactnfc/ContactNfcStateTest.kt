package app.metevo.wallet.contactnfc
import org.junit.Assert.*
import org.junit.Test
class ContactNfcStateTest {
    @Test fun stopsServingAndRejectsLateArmingInBackground() {
        ContactNfcState.setForeground(true)
        assertTrue(ContactNfcState.arm(byteArrayOf(1, 2, 3)))
        ContactNfcState.setForeground(false)
        assertNull(ContactNfcState.read())
        assertFalse(ContactNfcState.arm(byteArrayOf(1, 2, 3)))
        ContactNfcState.setForeground(true)
        assertNull(ContactNfcState.read())
        ContactNfcState.setForeground(false)
    }
}
