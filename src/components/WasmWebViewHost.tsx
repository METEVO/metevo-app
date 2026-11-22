import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  attachWasmWebView,
  handleWasmMessage,
  wasmCall,
} from '../services/metevo/wasmBridge';

/**
 * Hidden host for the on-device WASM RLN. It must stay mounted for the whole
 * session: the wallet state lives in this WebView.
 *
 * Android notes: a WebView ignores RN `opacity` (it renders a SurfaceView)
 * and native sizing beats small style dimensions, so "hidden" is done with an
 * offscreen transform on a clipped wrapper instead of opacity. The renderer
 * can also crash under memory pressure; onRenderProcessGone remounts it.
 */
export function WasmWebViewHost({
  mnemonic,
  runtimeId,
}: {
  /** The unlocked seed: the harness derives the wallet keys from it. */
  mnemonic: string;
  /** Stable per seed: drives the LN node identity and the wallet data_dir. */
  runtimeId: string;
}) {
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_WASM_PING !== '1') {
      return undefined;
    }
    const timer = setInterval(() => {
      const started = Date.now();
      void wasmCall('status')
        .then((result) => {
          console.log('[metevo] wasm ping ok', Date.now() - started, JSON.stringify(result));
        })
        .catch((error: unknown) => {
          console.log('[metevo] wasm ping failed', String(error));
        });
    }, 5_000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_WASM_SELFTEST !== '1') {
      return undefined;
    }
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      void wasmCall('selftest')
        .then((result) => {
          clearInterval(timer);
          console.log('[metevo] wasm selftest ok', JSON.stringify(result));
        })
        .catch((error: unknown) => {
          console.log('[metevo] wasm selftest attempt failed', String(error));
          if (attempts >= 36) {
            clearInterval(timer);
            console.log('[metevo] wasm selftest gave up');
          }
        });
    }, 30_000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const helper = process.env.EXPO_PUBLIC_WASM_HELPER_URL || 'http://192.168.1.147:3010';
  const indexer = process.env.EXPO_PUBLIC_WASM_INDEXER_URL || 'http://192.168.1.147:3002';
  const nodeProxy = process.env.EXPO_PUBLIC_WASM_NODE_PROXY_URL || 'ws://192.168.1.147:3001';

  return (
    <View style={styles.offscreen} pointerEvents="none">
      <WebView
        key={renderKey}
        ref={(instance) => {
          attachWasmWebView(instance);
        }}
        style={styles.webview}
        source={{
          uri: `file:///android_asset/wasm/harness.html?mnemonic=${encodeURIComponent(
            mnemonic,
          )}&runtimeId=${runtimeId}&helper=${encodeURIComponent(
            helper,
          )}&indexerUrl=${encodeURIComponent(indexer)}&nodeProxyUrl=${encodeURIComponent(nodeProxy)}`,
        }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onMessage={(event) => handleWasmMessage(event.nativeEvent.data)}
        onError={(event) => {
          console.log('[metevo] wasm host error:', event.nativeEvent.description);
        }}
        onRenderProcessGone={(event) => {
          // The Android renderer died (OOM or a wasm panic). Recreate it: the
          // bridge re-attaches via the ref and the page reloads fresh.
          console.log('[metevo] wasm renderer gone:', event.nativeEvent.didCrash);
          setRenderKey((k) => k + 1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Offscreen, clipped, non-touchable, behind the app. A 1x1 wrapper with
  // overflow hidden keeps the native view from expanding into the layout.
  offscreen: {
    position: 'absolute',
    width: 1,
    height: 1,
    left: 0,
    top: 0,
    overflow: 'hidden',
    zIndex: -1,
    elevation: -1,
    transform: [{ translateX: -5000 }, { translateY: -5000 }],
  },
  webview: {
    width: '100%',
    height: '100%',
  },
});
