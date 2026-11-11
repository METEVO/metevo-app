import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Text, useWindowDimensions, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { metevoDesignTokens } from '../../design/designTokens';
import { useTheme, useThemedStyles, type MetevoTheme } from '../../design/ThemeContext';
import { logContactEvent } from '../../services/metevo/contactEvents';
import { classifyScannedCode } from '../../services/metevo/contactQr';
import { openNfcSettings } from '../../services/metevo/contactNfc';
import { useContactNfcReader } from '../../hooks/useContactNfc';
import { TextLink } from './CompactField';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';

const TASK_PANEL_INSET = 10;
/** Two caption lines above the camera, for the hint or the last notice. */
const STATUS_HEIGHT = 40;

/** The viewfinder, its status line and Back must fit the fixed task panel:
 * text below the camera would be out of sight. */
function useViewfinderSide(): number {
  const { width } = useWindowDimensions();
  const panelInner = scale(metevoDesignTokens.layout.taskCanvas.height - TASK_PANEL_INSET * 2);
  const available = panelInner - STATUS_HEIGHT - layout.secondaryButton - layout.rowGap * 2;
  return Math.max(120, Math.floor(Math.min(available, width * 0.8)));
}

const FOREIGN_CODE = 'Not a METEVO contact. Scan the QR shown in their METEVO app.';
const NOT_QUEUED = 'This contact is already waiting for review. Close Contacts to see it.';
const NFC_NOT_METEVO = 'That phone is not sharing a METEVO contact. Ask them to open Show QR code.';
const NFC_FAILED = 'The tap was too short. Hold the phones back to back and keep them still.';

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
  const side = useViewfinderSide();
  const askedOnOpen = useRef(false);
  const loggedForeign = useRef(false);

  useEffect(() => { logContactEvent('scan:opened'); }, []);

  useEffect(() => {
    if (permission !== null && !permission.granted && !permission.canAskAgain) {
      logContactEvent('scan:permission-denied');
    }
  }, [permission]);

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
      // The scanner reports every frame; one log line per scanner session.
      if (!loggedForeign.current) logContactEvent('scan:foreign-code');
      loggedForeign.current = true;
      setNotice(FOREIGN_CODE);
      return;
    }
    handled.current = true;
    logContactEvent('scan:contact-link');
    if (!onContactLink(scanned.link)) {
      handled.current = false;
      logContactEvent('scan:not-queued');
      setNotice(NOT_QUEUED);
    }
  }, [onContactLink]);

  // NFC and camera feed the same routing: a tapped link that is not a
  // METEVO contact gets the same notice as a foreign QR code.
  const onNfcLink = useCallback((link: string) => {
    const received = classifyScannedCode(link);
    if (received.kind === 'foreign') {
      setNotice(FOREIGN_CODE);
      return false;
    }
    if (onContactLink(received.link)) return true;
    logContactEvent('scan:not-queued');
    setNotice(NOT_QUEUED);
    return false;
  }, [onContactLink]);
  const nfc = useContactNfcReader(onNfcLink);
  const nfcNotice = nfc.notice === 'not-metevo' ? NFC_NOT_METEVO : nfc.notice === 'failed' ? NFC_FAILED : null;

  let body: React.ReactNode;
  let action: React.ReactNode = null;
  if (permission === null) {
    body = <Text style={theme.typography.body}>Opening the camera…</Text>;
  } else if (permission.granted) {
    body = (
      <View style={[styles.viewfinder, { width: side, height: side }]}>
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

  const hint = nfc.status === 'ready'
    ? 'Point the camera at their QR code, or hold the phones back to back.'
    : permission?.granted ? 'Point the camera at the QR code on their phone.' : 'Scan a contact';
  const shownNotice = notice ?? nfcNotice;
  const status = shownNotice ?? hint;

  return (
    <View style={styles.canvas}>
      <Text
        style={[shownNotice === null ? theme.typography.caption : styles.notice, styles.status]}
        numberOfLines={2}
        accessibilityLiveRegion="polite"
      >
        {status}
      </Text>
      {body}
      <View style={styles.actions}>
        <ActionButton label="Back" variant="outlined" onPress={onCancel} grow />
        {action}
      </View>
      {nfc.status === 'disabled' && (
        <TextLink label="NFC is off. Turn it on to receive by tapping phones." onPress={() => void openNfcSettings()} />
      )}
    </View>
  );
}

const makeStyles = (theme: MetevoTheme) => ({
  canvas: { width: '100%' as const, gap: layout.rowGap },
  viewfinder: {
    alignSelf: 'center' as const,
    borderRadius: scale(5),
    overflow: 'hidden' as const,
  },
  status: { minHeight: STATUS_HEIGHT },
  camera: { flex: 1 },
  notice: { ...theme.typography.caption, fontWeight: '700' as const, color: theme.voiceStates.attention.ink },
  actions: { flexDirection: 'row' as const, gap: layout.rowGap },
});
