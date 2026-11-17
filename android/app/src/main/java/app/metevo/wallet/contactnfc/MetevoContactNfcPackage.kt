package app.metevo.wallet.contactnfc

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager

/** Registers MetevoContactNfcModule (added manually in MainApplication). */
class MetevoContactNfcPackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> = listOf(MetevoContactNfcModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<View, ReactShadowNode<*>>> = emptyList()
}
