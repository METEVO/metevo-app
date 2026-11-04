import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { useTheme, useThemedStyles, type MetevoTheme } from '../../design/ThemeContext';
import { classifyScannedCode } from '../../services/metevo/contactQr';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';

const FOREIGN_CODE = 'This QR code is not a METEVO contact. Scan the code shown in their METEVO app.';
const NOT_QUEUED = 'This contact is already waiting for review. Close Contacts to see it.';

interface ContactQrScannerProps {
  /** Returns false when the import queue did not accept the link. */
  onContactLink: (link: string) => boolean;
  onCancel: () => void;
}

export function ContactQrScanner({ onContactLink, onCancel }: ContactQrScannerProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const [notice, setNotice] = useState<string | null>(null);
  const handled = useRef(false);
  const askedOnOpen = useRef(false);

  useEffect(() => {
    if (permission === null || askedOnOpen.current) return;
    askedOnOpen.current = true;
    if (!permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  // The user may grant access in system Settings and come back.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => subscription.remove();
  }, [onCancel]);

  const onBarcodeScanned = useCallback(({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    const scanned = classifyScannedCode(data);
    if (scanned.kind === 'foreign') {
      setNotice(FOREIGN_CODE);
      return;
    }
    handled.current = true;
    if (!onContactLink(scanned.link)) {
      handled.current = false;
      setNotice(NOT_QUEUED);
    }
  }, [onContactLink]);

  let body: React.ReactNode;
  let action: React.ReactNode = null;
  if (permission === null) {
    body = <Text style={theme.typography.body}>Opening the camera…</Text>;
  } else if (permission.granted) {
    body = (
      <View style={styles.viewfinder}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      </View>
    );
  } else if (permission.canAskAgain) {
    body = <Text style={theme.typography.body}>METEVO needs the camera to read a contact QR code.</Text>;
    action = <ActionButton label="Allow camera" variant="primary" onPress={() => void requestPermission()} grow />;
  } else {
    body = <Text style={theme.typography.body}>Camera access is off. Turn it on in Settings to scan a contact.</Text>;
    action = <ActionButton label="Open Settings" variant="primary" onPress={() => void Linking.openSettings()} grow />;
  }

  return (
    <View style={styles.canvas}>
      <Text style={theme.typography.title}>Scan a contact</Text>
      {body}
      {permission?.granted && (
        <Text style={theme.typography.caption}>Point the camera at the QR code on their phone.</Text>
      )}
      {notice !== null && <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text>}
      <View style={styles.actions}>
        <ActionButton label="Back" variant="outlined" onPress={onCancel} grow />
        {action}
      </View>
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  canvas: { width: '100%' as const, gap: layout.rowGap },
  viewfinder: {
    width: '100%' as const,
    aspectRatio: 1,
    borderRadius: scale(5),
    overflow: 'hidden' as const,
  },
  camera: { flex: 1 },
  notice: { ...theme.typography.caption, color: theme.voiceStates.attention.ink },
  actions: { flexDirection: 'row' as const, gap: layout.rowGap },
});
