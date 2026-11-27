import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = { url: string };

/**
 * Dev-only surface for the WASM RLN spike: loads the wasm-sdk harness page in a
 * WebView and mirrors its status messages into the RN log.
 */
export function WasmHarnessScreen({ url }: Props) {
  const [status, setStatus] = useState('loading');

  return (
    <View style={styles.root}>
      <Text style={styles.status} numberOfLines={3}>
        {status}
      </Text>
      <WebView
        style={styles.web}
        source={{ uri: url }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        onMessage={(event) => {
          const data = event.nativeEvent.data;
          console.log('[metevo] wasm-harness:', data.slice(0, 500));
          setStatus(data.slice(0, 200));
        }}
        onError={(event) => {
          const description = event.nativeEvent.description;
          console.log('[metevo] wasm-harness error:', description);
          setStatus(`error: ${description}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  status: { color: '#00e5a0', fontSize: 11, padding: 6 },
  web: { flex: 1, backgroundColor: '#000' },
});
