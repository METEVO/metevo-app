import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { encodeContactQr, QR_QUIET_ZONE_MODULES } from '../../services/metevo/contactQr';

const MAX_QR_SIDE = 280;

/** Dark-on-white regardless of theme: scanners need the original contrast. */
export function ContactQrCode({ link, accessibilityLabel }: { link: string; accessibilityLabel: string }) {
  const { width } = useWindowDimensions();
  const side = Math.min(MAX_QR_SIDE, Math.round(width * 0.7));
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
