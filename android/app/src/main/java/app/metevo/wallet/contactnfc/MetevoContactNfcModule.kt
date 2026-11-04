package app.metevo.wallet.contactnfc

import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.tech.IsoDep
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream

/**
 * Contact sharing over NFC (src/services/metevo/contactNfc.ts).
 *
 *   sharing phone: startSharing(frame) -> HCE serves it -> stopSharing()
 *   reading phone: readFrame(timeout) -> reader mode, SELECT, READ BINARY
 *
 * Independent from MetevoLocalLinkModule: own AID, own state, own reader
 * callback. Only one read is in flight; a new read cancels the previous one.
 */
class MetevoContactNfcModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "MetevoContactNfcModule"
        /** Length header plus the JS link budget (MAX_CONTACT_LINK_BYTES). */
        private const val MAX_FRAME_BYTES = 2 + 1024
        private const val READ_CHUNK_BYTES = 240
        private const val STATUS_OK_HI = 0x90.toByte()
        private const val STATUS_OK_LO = 0x00.toByte()
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val lock = Any()
    private var pendingRead: PendingRead? = null

    private inner class PendingRead(val promise: Promise, val adapter: NfcAdapter) {
        var settled = false
        val timeout = Runnable { finish(this) { it.reject("ETIMEOUT", "no METEVO contact was tapped in time") } }
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun getStatus(promise: Promise) {
        val adapter = NfcAdapter.getDefaultAdapter(reactContext)
        val hasHce = reactContext.packageManager.hasSystemFeature("android.hardware.nfc.hce")
        promise.resolve(
            when {
                adapter == null || !hasHce -> "unsupported"
                !adapter.isEnabled -> "disabled"
                else -> "ready"
            },
        )
    }

    @ReactMethod
    fun startSharing(frameBase64: String, promise: Promise) {
        try {
            val frame = Base64.decode(frameBase64, Base64.NO_WRAP)
            if (frame.size < 3 || frame.size > MAX_FRAME_BYTES) {
                promise.reject("EINVAL", "contact frame has an invalid size: ${frame.size}")
                return
            }
            ContactNfcState.sharedFrame.set(frame)
            promise.resolve(null)
        } catch (cause: Exception) {
            promise.reject("EINVAL", "contact frame is not valid base64", cause)
        }
    }

    @ReactMethod
    fun stopSharing(promise: Promise) {
        ContactNfcState.sharedFrame.set(null)
        promise.resolve(null)
    }

    @ReactMethod
    fun readFrame(timeoutMs: Int, promise: Promise) {
        val adapter = NfcAdapter.getDefaultAdapter(reactContext)
        if (adapter == null || !adapter.isEnabled) {
            promise.reject("ENFC", "NFC is off or not available")
            return
        }
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("ENFC", "no foreground activity for reader mode")
            return
        }
        val read = PendingRead(promise, adapter)
        synchronized(lock) {
            pendingRead?.let { previous -> finish(previous) { it.reject("ECANCELLED", "replaced by a new read") } }
            pendingRead = read
        }
        mainHandler.postDelayed(read.timeout, timeoutMs.coerceAtLeast(1).toLong())
        adapter.enableReaderMode(
            activity,
            { tag ->
                val isoDep = IsoDep.get(tag) ?: return@enableReaderMode
                try {
                    isoDep.connect()
                    isoDep.timeout = 3_000
                    val frame = readContactFrame(isoDep)
                    finish(read) { it.resolve(Base64.encodeToString(frame, Base64.NO_WRAP)) }
                } catch (notMetevo: NotMetevoException) {
                    finish(read) { it.reject("ENOTMETEVO", notMetevo.message) }
                } catch (cause: Exception) {
                    finish(read) { it.reject("EREAD", "reading the contact failed", cause) }
                } finally {
                    try {
                        isoDep.close()
                    } catch (ignored: Exception) {
                        // The other phone already moved away.
                    }
                }
            },
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null,
        )
    }

    @ReactMethod
    fun cancelRead(promise: Promise) {
        synchronized(lock) { pendingRead }?.let { read ->
            finish(read) { it.reject("ECANCELLED", "read cancelled") }
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun openSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NFC_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (cause: Exception) {
            promise.reject("ESETTINGS", "NFC settings are not available", cause)
        }
    }

    /** Settles a read exactly once and always leaves reader mode. */
    private fun finish(read: PendingRead, settle: (Promise) -> Unit) {
        synchronized(lock) {
            if (read.settled) return
            read.settled = true
            if (pendingRead === read) pendingRead = null
        }
        mainHandler.removeCallbacks(read.timeout)
        mainHandler.post {
            reactContext.currentActivity?.let { activity ->
                try {
                    read.adapter.disableReaderMode(activity)
                } catch (ignored: Exception) {
                    // Activity already paused: reader mode ended with it.
                }
            }
        }
        settle(read.promise)
    }

    private class NotMetevoException(message: String) : Exception(message)

    private fun readContactFrame(isoDep: IsoDep): ByteArray {
        val select = byteArrayOf(
            0x00, 0xA4.toByte(), 0x04, 0x00, MetevoContactNfcApduService.CONTACT_AID.size.toByte(),
        ) + MetevoContactNfcApduService.CONTACT_AID
        if (!isOk(isoDep.transceive(select))) {
            throw NotMetevoException("the tapped phone is not sharing a METEVO contact")
        }
        val header = readBinary(isoDep, 0, 2)
        val length = ((header[0].toInt() and 0xFF) shl 8) or (header[1].toInt() and 0xFF)
        if (length == 0 || length + 2 > MAX_FRAME_BYTES) {
            throw NotMetevoException("the shared contact has an invalid length")
        }
        val out = ByteArrayOutputStream()
        out.write(header)
        var offset = 2
        while (offset < length + 2) {
            val chunk = readBinary(isoDep, offset, minOf(READ_CHUNK_BYTES, length + 2 - offset))
            out.write(chunk)
            offset += chunk.size
        }
        return out.toByteArray()
    }

    private fun readBinary(isoDep: IsoDep, offset: Int, length: Int): ByteArray {
        val response = isoDep.transceive(
            byteArrayOf(0x00, 0xB0.toByte(), ((offset shr 8) and 0xFF).toByte(), (offset and 0xFF).toByte(), length.toByte()),
        )
        if (!isOk(response) || response.size - 2 != length) {
            throw IllegalStateException("short READ BINARY response")
        }
        return response.copyOfRange(0, response.size - 2)
    }

    private fun isOk(response: ByteArray): Boolean =
        response.size >= 2 && response[response.size - 2] == STATUS_OK_HI && response[response.size - 1] == STATUS_OK_LO

    override fun invalidate() {
        ContactNfcState.sharedFrame.set(null)
        synchronized(lock) { pendingRead }?.let { read ->
            finish(read) { it.reject("ECANCELLED", "module closed") }
        }
        super.invalidate()
    }
}
