// Global test doubles: the gateway layer now transitively imports
// react-native and the Bare kit; suites that don't test them still need
// them resolvable with inert behavior.

jest.mock('react-native', () => ({
  Image: {
    resolveAssetSource: jest.fn(() => ({ uri: 'file:///mock/wallet.rlnbundle' })),
  },
}));

// Fake Bare worklet host: instances are registered on the mock itself so
// suites can drive and inspect the IPC channel. Virtual because the
// runtime artifact package is not installable yet (upstream pairing
// blocker - see changes_overview_wallet-onboarding-lsp.md).
jest.mock(
  'react-native-bare-kit',
  () => {
    const instances: Array<{
      dataHandlers: Array<(chunk: Uint8Array) => void>;
      written: string[];
      IPC: {
        on: (event: string, handler: (chunk: Uint8Array) => void) => void;
        write: (chunk: Uint8Array) => void;
      };
    }> = [];

    const Worklet = jest.fn(function () {
      const instance = {
        dataHandlers: [] as Array<(chunk: Uint8Array) => void>,
        written: [] as string[],
        started: null as { entry: string; source: string } | null,
        IPC: {
          on: (_event: string, handler: (chunk: Uint8Array) => void) => {
            instance.dataHandlers.push(handler);
          },
          write: (chunk: Uint8Array) => {
            const text = Buffer.from(chunk).toString('utf8');
            instance.written.push(text);
            // Simulate the real bootstrap: a load frame is answered with
            // a bootstrap-loaded event once it arrives.
            for (const line of text.split('\n')) {
              if (line.includes('"method":"load"')) {
                const reply = new TextEncoder().encode(
                  JSON.stringify({
                    event: 'bootstrap-loaded',
                    libDir: '/data/app/~~test/app.metevo.wallet-test/lib/arm64',
                  }) + '\n',
                );
                setImmediate(() => {
                  for (const handler of [...instance.dataHandlers]) {
                    handler(reply);
                  }
                });
              }
            }
          },
        },
        start: (entry: string, source: string) => {
          instance.started = { entry, source };
        },
      };
      instances.push(instance);
      return instance;
    });

    (Worklet as unknown as { mockInstances: typeof instances }).mockInstances =
      instances;

    return { Worklet };
  },
  { virtual: true },
);
