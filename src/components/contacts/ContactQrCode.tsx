import React, { useEffect, useMemo } from 'react';
import { BackHandler, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { metevoDesignTokens } from '../../design/designTokens';
import { useTheme } from '../../design/ThemeContext';
import { encodeContactQr, QR_QUIET_ZONE_MODULES } from '../../services/metevo/contactQr';
import { layout, scale } from '../styles';
import { ActionButton } from '../ui/ActionButton';

const TASK_PANEL_INSET = 10;

/** The code and its Back button must fit the fixed task panel without
 * scrolling: the panel has no visible scroll indicator. */
function useQrSide(): number {
  const { width } = useWindowDimensions();
  const panelInner = scale(metevoDesignTokens.layout.taskCanvas.height - TASK_PANEL_INSET * 2);
  const available = panelInner - layout.secondaryButton - layout.rowGap;
  return Math.max(120, Math.floor(Math.min(available, width * 0.7)));
}

/** Dark-on-white regardless of theme: scanners need the original contrast. */
export function ContactQrCode({ link, accessibilityLabel }: { link: string; accessibilityLabel: string }) {
  const side = useQrSide();
  const symbol = useMemo(() => encodeContactQr(link), [link]);
  const extent = symbol.size + QR_QUIET_ZONE_MODULES * 2;
  return (
    <Svg
      width={side}
      height={side}
      viewBox={`${-QR_QUIET_ZONE_MODULES} ${-QR_QUIET_ZONE_MODULES} ${extent} ${extent}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Rect x={-QR_QUIET_ZONE_MODULES} y={-QR_QUIET_ZONE_MODULES} width={extent} height={extent} fill="#ffffff" />
      <Path d={symbol.path} fill="#000000" />
    </Svg>
  );
}

interface ContactQrViewProps {
  link: string;
  name: string;
  /** What the code contains, in the user's words. */
  contents: string;
  onBack: () => void;
}

export function ContactQrView({ link, name, contents, onBack }: ContactQrViewProps) {
  const theme = useTheme();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  return (
    <View style={{ width: '100%', gap: layout.rowGap }}>
      <View style={{ alignItems: 'center' }}>
        <ContactQrCode link={link} accessibilityLabel={`QR code to add ${name}`} />
      </View>
      <ActionButton label="Back" variant="outlined" onPress={onBack} />
      <Text style={theme.typography.body}>{name}: ask the other person to tap Scan QR code in Contacts.</Text>
      <Text style={theme.typography.caption}>{contents}</Text>
    </View>
  );
}
