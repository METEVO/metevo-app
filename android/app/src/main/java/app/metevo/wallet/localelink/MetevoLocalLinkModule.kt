package app.metevo.wallet.localelink

import android.app.Activity
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.nfc.tech.IsoDep
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.util.Base64 as JavaBase64

/**
 * METEVO local link: NFC credential tag (HCE, private AID
 * F04D455445564F01) + Wi-Fi Direct 2.4 GHz group + invoice socket.
 *
 * Lifecycle contract with the JS side (src/services/localelink):
 *   receiver: startTagEmulation -> startGroup -> serveInvoice -> ... -> stopGroup
 *   payer:    readNfcCredentials -> (connectToGroup via fetchInvoice) -> fetchInvoice
 * stopGroup is mandatory in a finally block on the JS side and is
 * idempotent here.
 */
class MetevoLocalLinkModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "MetevoLocalLinkModule"
        private const val NFC_READER_TIMEOUT_MS = 30_000L
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var server: MetevoLocalLinkServer? = null
    private var readerCallback: NfcAdapter.ReaderCallback? = null

    override fun getName(): String = NAME

    // --- Receiver side -----------------------------------------------------

    /** Stores the 240-byte credential frame the HCE service serves. */
    @ReactMethod
    fun startTagEmulation(frameBase64: String, promise: Promise) {
        try {
            val frame = JavaBase64.getDecoder().decode(frameBase64)
            if (frame.size != 240) {
                promise.reject("EINVAL", "credential frame must be exactly 240 bytes, got ${frame.size}")
                return
            }
            LocalLinkState.credentialFrame.set(frame)
            promise.resolve(null)
        } catch (cause: Exception) {
            promise.reject("ELOCALELINK", "startTagEmulation failed", cause)
        }
    }

    @ReactMethod
    fun startGroup(port: Int, promise: Promise) {
        try {
            if (!hasLocationPermission()) {
                promise.reject(
                    "EPERMISSION",
                    "Wi-Fi Direct needs the location / nearby-devices permission; grant it and retry",
                )
                return
            }
            val link = server ?: MetevoLocalLinkServer(reactContext).also { server = it }
            val formed = link.createGroup(15_000)
            if (!formed) {
                promise.reject("EGROUP", "the Wi-Fi Direct group did not form in time")
                return
            }
            link.startSocketServer(port)
            val map: WritableMap = Arguments.createMap()
            map.putString("ownerAddress", MetevoLocalLinkServer.GROUP_OWNER_ADDRESS)
            map.putInt("port", port)
            promise.resolve(map)
        } catch (cause: Exception) {
            promise.reject("EGROUP", "startGroup failed", cause)
        }
    }

    @ReactMethod
    fun serveInvoice(sessionId: String, invoice: String, promise: Promise) {
        try {
            LocalLinkState.servedInvoice.set(LocalLinkState.ServedInvoice(sessionId, invoice))
            promise.resolve(null)
        } catch (cause: Exception) {
            promise.reject("ELOCALELINK", "serveInvoice failed", cause)
        }
    }

    // --- Payer side --------------------------------------------------------

    /**
     * Reads the receiver's credential frame after the tap: the reader
     * selects the private AID and pulls the frame with READ BINARY.
     */
    @ReactMethod
    fun readNfcCredentials(timeoutMs: Int, promise: Promise) {
        try {
            val adapter = NfcAdapter.getDefaultAdapter(reactContext)
                ?: run {
                    promise.reject("ENFC", "this device has no NFC adapter")
                    return
                }
            val activity: Activity? = currentActivity
            if (activity == null) {
                promise.reject("ENFC", "no foreground activity for reader mode")
                return
            }
            val timeoutMillis = timeoutMs.coerceAtLeast(1).toLong()
            var settled = false
            val timeoutRunnable = Runnable {
                if (!settled) {
                    settled = true
                    disableReaderMode(adapter)
                    promise.reject("ETIMEOUT", "no METEVO tag answered before the timeout")
                }
            }
            mainHandler.postDelayed(timeoutRunnable, timeoutMillis)

            readerCallback = NfcAdapter.ReaderCallback { rawTag ->
                if (settled) {
                    return@ReaderCallback
                }
                val isoDep = IsoDep.get(rawTag)
                if (isoDep == null) {
                    return@ReaderCallback
                }
                try {
                    isoDep.connect()
                    isoDep.timeout = 5_000
                    val frame = readCredentialFrame(isoDep)
                    settled = true
                    mainHandler.removeCallbacks(timeoutRunnable)
                    disableReaderMode(adapter)
                    promise.resolve(
                        Base64.encodeToString(frame, Base64.NO_WRAP),
                    )
                } catch (cause: Exception) {
                    if (!settled) {
                        settled = true
                        mainHandler.removeCallbacks(timeoutRunnable)
                        disableReaderMode(adapter)
                        promise.reject("ENFC", "reading the METEVO tag failed", cause)
                    }
                } finally {
                    try {
                        isoDep.close()
                    } catch (ignored: Exception) {
                        // Tag already gone.
                    }
                }
            }
            adapter.enableReaderMode(
                activity,
                readerCallback,
                NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
                null,
            )
        } catch (cause: Exception) {
            promise.reject("ENFC", "readNfcCredentials failed", cause)
        }
    }

    /** SELECT the private AID, then pull the frame in READ BINARY chunks. */
    private fun readCredentialFrame(isoDep: IsoDep): ByteArray {
        val select = byteArrayOf(
            0x00, 0xA4.toByte(), 0x04, 0x00, MetevoLocalLinkApduService.LOCAL_LINK_AID.size.toByte(),
        ) + MetevoLocalLinkApduService.LOCAL_LINK_AID
        val selectResponse = isoDep.transceive(select)
        if (selectResponse.size < 2 ||
            selectResponse[selectResponse.size - 2] != 0x90.toByte() ||
            selectResponse[selectResponse.size - 1] != 0x00
        ) {
            throw IllegalStateException("the tapped tag does not carry the METEVO local link")
        }
        val frameSize = 240
        val out = java.io.ByteArrayOutputStream()
        var offset = 0
        while (offset < frameSize) {
            val chunk = minOf(255, frameSize - offset)
            val read = byteArrayOf(
                0x00,
                0xB0.toByte(),
                ((offset shr 8) and 0xFF).toByte(),
                (offset and 0xFF).toByte(),
                chunk.toByte(),
            )
            val response = isoDep.transceive(read)
            if (response.size < 2) {
                throw IllegalStateException("short READ BINARY response")
            }
            out.write(response, 0, response.size - 2)
            offset += response.size - 2
        }
        return out.toByteArray()
    }

    private fun disableReaderMode(adapter: NfcAdapter) {
        val activity = currentActivity ?: return
        val callback = readerCallback
        if (callback != null) {
            adapter.disableReaderMode(activity)
            readerCallback = null
        }
    }

    // --- Payer side (continued) --------------------------------------------

    /** Joins the receiver's Wi-Fi Direct group with the tag credentials. */
    @ReactMethod
    fun connectToGroup(ssid: String, password: String, timeoutMs: Int, promise: Promise) {
        try {
            val link = server ?: MetevoLocalLinkServer(reactContext).also { server = it }
            val joined = link.connectToGroup(ssid, password, timeoutMs.toLong())
            if (!joined) {
                promise.reject("EGROUP", "the receiver's group did not accept the join in time")
                return
            }
            promise.resolve(null)
        } catch (cause: Exception) {
            promise.reject("EGROUP", "connectToGroup failed", cause)
        }
    }

    /** One invoice fetch over the P2P socket (`fetch <sessionId>`). */
    @ReactMethod
    fun fetchInvoice(host: String, port: Int, sessionId: String, timeoutMs: Int, promise: Promise) {
        try {
            val link = server ?: MetevoLocalLinkServer(reactContext).also { server = it }
            promise.resolve(link.fetchInvoice(host, port, sessionId, timeoutMs.toLong()))
        } catch (cause: Exception) {
            promise.reject("EFETCH", "fetchInvoice failed", cause)
        }
    }

    // --- Shared lifecycle ----------------------------------------------------

    @ReactMethod
    fun stopGroup(promise: Promise) {
        try {
            // Tear down even when the current activity is gone: the server
            // holds no activity reference.
            server?.stop()
            server = null
            LocalLinkState.clear()
            promise.resolve(null)
        } catch (cause: Exception) {
            // Teardown must never wedge the finally block: report and reset.
            server = null
            LocalLinkState.clear()
            promise.reject("ELOCALELINK", "stopGroup failed (state reset anyway)", cause)
        }
    }

    @ReactMethod
    fun setKeepScreenOn(enabled: Boolean, promise: Promise) {
        try {
            val activity = currentActivity
            if (activity != null && activity.window != null) {
                if (enabled) {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
            promise.resolve(null)
        } catch (cause: Exception) {
            promise.reject("ELOCALELINK", "setKeepScreenOn failed", cause)
        }
    }

    override fun invalidate() {
        // The React context is dying: release the hardware regardless.
        try {
            server?.stop()
        } finally {
            server = null
            LocalLinkState.clear()
            super.invalidate()
        }
    }

    private fun hasLocationPermission(): Boolean {
        val fine = reactContext.checkSelfPermission(
            android.Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val nearby = reactContext.checkSelfPermission(
            "android.permission.NEARBY_WIFI_DEVICES",
        ) == PackageManager.PERMISSION_GRANTED
        return fine || nearby
    }
}
