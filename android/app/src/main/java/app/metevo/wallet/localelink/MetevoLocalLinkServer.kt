package app.metevo.wallet.localelink

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.p2p.WifiP2pGroup
import android.net.wifi.p2p.WifiP2pManager
import android.util.Log
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference
import javax.net.SocketFactory

/**
 * Owns the receiver-side hardware lifecycle: the Wi-Fi Direct group (the
 * 2.4 GHz P2P group owner on the 192.168.49.x subnet) and the invoice
 * socket server. Every method is safe to call after teardown; stop() is
 * idempotent and releases everything the receive flow acquired.
 */
class MetevoLocalLinkServer(private val context: Context) {
    companion object {
        private const val TAG = "MetevoLocalLink"
        /** Wi-Fi Direct group owners address the group at this fixed subnet. */
        const val GROUP_OWNER_ADDRESS = "192.168.49.1"
    }

    private val manager = context.getSystemService(Context.WIFI_P2P_SERVICE) as WifiP2pManager
    private val channel: WifiP2pManager.Channel =
        manager.initialize(context, context.mainLooper, null)
    private val executor: ExecutorService = Executors.newCachedThreadPool()

    private var serverSocket: ServerSocket? = null
    private val acquiredNetwork = AtomicReference<Network?>(null)
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var groupFormed = false

    /** Creates the Wi-Fi Direct group and waits until it is formed. */
    fun createGroup(timeoutMs: Long): Boolean {
        manager.createGroup(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                Log.d(TAG, "Wi-Fi Direct group creation started")
            }

            override fun onFailure(reason: Int) {
                Log.w(TAG, "Wi-Fi Direct group creation failed: $reason")
            }
        })
        // The group needs a moment to negotiate; poll the group info.
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            val formed = AtomicReference<Boolean>(null)
            manager.requestGroupInfo(channel) { group: WifiP2pGroup? ->
                groupFormed = group != null
                formed.set(group != null)
            }
            if (formed.get() == true) {
                return true
            }
            Thread.sleep(250)
        }
        return groupFormed
    }

    /** Opens the invoice socket server on the P2P interface. */
    @Throws(IOException::class)
    fun startSocketServer(port: Int) {
        check(serverSocket == null) { "socket server already running" }
        val socket = ServerSocket(port, 8, InetAddress.getByName(GROUP_OWNER_ADDRESS))
        serverSocket = socket
        executor.execute {
            while (!socket.isClosed) {
                try {
                    val client = socket.accept()
                    executor.execute { serveClient(client) }
                } catch (ignored: IOException) {
                    // Socket closed by stop(): the loop exits.
                    break
                }
            }
        }
    }

    /** One request line in (`fetch <sessionId>`), one response line out. */
    private fun serveClient(client: Socket) {
        try {
            client.soTimeout = 5_000
            val reader = BufferedReader(InputStreamReader(client.inputStream))
            val line = reader.readLine()?.trim() ?: ""
            val expected = LocalLinkState.servedInvoice.get()
            val sessionId = line.removePrefix("fetch ").trim()
            val writer = PrintWriter(client.outputStream, false)
            val answer =
                if (expected != null && sessionId == expected.sessionId) {
                    expected.invoice
                } else {
                    "error unknown session"
                }
            writer.print(answer + "\n")
            writer.flush()
        } catch (ignored: IOException) {
            Log.d(TAG, "client connection dropped")
        } finally {
            try {
                client.close()
            } catch (ignored: IOException) {
                // Already closed.
            }
        }
    }

    /**
     * Payer side: joins the receiver's group with the credentials read
     * from the NFC tag (Android 10+ WifiNetworkSpecifier; the group is a
     * WPA2 network). Resolves once the network is available.
     */
    fun connectToGroup(ssid: String, password: String, timeoutMs: Long): Boolean {
        val connectivity =
            context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val specifier = android.net.wifi.WifiNetworkSpecifier.Builder()
            .setSsid(ssid)
            .setWpa2Passphrase(password)
            .build()
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .setNetworkSpecifier(specifier)
            .build()
        val result = AtomicReference<Boolean>(null)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                acquiredNetwork.set(network)
                result.set(true)
            }

            override fun onUnavailable() {
                result.set(false)
            }
        }
        networkCallback = callback
        connectivity.requestNetwork(request, callback, timeoutMs.toInt())
        return result.get() == true
    }

    /** TCP fetch over the P2P link (payer side). */
    fun fetchInvoice(host: String, port: Int, sessionId: String, timeoutMs: Long): String {
        val network = acquiredNetwork.get()
        val socket: Socket =
            if (network != null) {
                val factory: SocketFactory = network.socketFactory
                factory.createSocket()
            } else {
                Socket()
            }
        socket.soTimeout = timeoutMs.toInt().coerceAtLeast(1)
        try {
            socket.connect(
                InetSocketAddress(InetAddress.getByName(host), port),
                timeoutMs.toInt().coerceAtLeast(1),
            )
            val writer = PrintWriter(socket.outputStream, false)
            writer.print("fetch $sessionId\n")
            writer.flush()
            val reader = BufferedReader(InputStreamReader(socket.inputStream))
            return reader.readLine() ?: throw IOException("empty response")
        } finally {
            try {
                socket.close()
            } catch (ignored: IOException) {
                // Already closed.
            }
        }
    }

    /**
     * Idempotent teardown: closes the server, releases the P2P group and
     * the requested network, clears served state. Safe in `finally`.
     */
    fun stop() {
        try {
            serverSocket?.close()
        } catch (ignored: IOException) {
            // Already closed.
        }
        serverSocket = null
        networkCallback?.let { callback ->
            val connectivity =
                context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            try {
                connectivity.unregisterNetworkCallback(callback)
            } catch (ignored: IllegalArgumentException) {
                // Never registered or already unregistered.
            }
            networkCallback = null
        }
        acquiredNetwork.set(null)
        if (groupFormed) {
            manager.removeGroup(channel, null)
            groupFormed = false
        }
        LocalLinkState.clear()
        Log.d(TAG, "local link torn down")
    }
}
