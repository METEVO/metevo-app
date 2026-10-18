declare module '*.svg' {
  import { type ComponentType } from 'react';
  import { type SvgProps } from 'react-native-svg';

  const SvgComponent: ComponentType<SvgProps>;
  export default SvgComponent;
}

declare module '*.rlnbundle' {
  const bundleAsset: number;
  export default bundleAsset;
}

declare module 'react-native-bare-kit' {
  export class Worklet {
    IPC: {
      on(event: string, handler: (chunk: Uint8Array) => void): void;
      write(chunk: Uint8Array): void;
    };
    start(entry: string, source: string): void;
  }
}
