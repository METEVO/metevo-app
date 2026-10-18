import { rewriteLinkedAddons } from '../../src/services/metevo/bundleAddonRewrite';

const LIB_DIR = '/data/app/~~t/app.metevo.wallet-t/lib/arm64';

function pack(header: Record<string, unknown>, blob = '{}'): string {
  const json = JSON.stringify(header);
  return String(json.length + 1) + '\n' + json + blob;
}

function headerWithAddon(addon: string): Record<string, unknown> {
  return {
    version: 0,
    id: null,
    main: '/main.js',
    imports: {},
    resolutions: {
      '/main.js': {
        '#package': '/package.json',
        'bare-type': { addon },
      },
    },
    addons: [addon],
    assets: [],
    files: {
      '/package.json': { offset: 0, length: 2, mode: 420 },
      '/main.js': { offset: 2, length: 2, mode: 420 },
    },
  };
}

describe('rewriteLinkedAddons', () => {
  test('rewrites resolution and addon-list references to file URLs', () => {
    const { source, rewritten } = rewriteLinkedAddons(
      pack(headerWithAddon('linked:libbare-type.1.4.0.so')),
      LIB_DIR,
    );

    expect(rewritten).toBe(2);
    expect(source).toContain(
      `"addon":"file://${LIB_DIR}/libbare-type.1.4.0.so"`,
    );
    expect(source).toContain(`"file://${LIB_DIR}/libbare-type.1.4.0.so"`);
    expect(source).not.toContain('"addon":"linked:');

    // The rewritten bundle must still be a structurally valid pack.
    const newlineIndex = source.indexOf('\n');
    const headerLength = Number(source.slice(0, newlineIndex));
    const header = JSON.parse(
      source.slice(newlineIndex + 1, newlineIndex + headerLength),
    );
    expect(header.resolutions['/main.js']['bare-type'].addon).toBe(
      `file://${LIB_DIR}/libbare-type.1.4.0.so`,
    );
  });

  test('keeps the blob untouched and the prefix length exact', () => {
    const original = pack(headerWithAddon('linked:libbare-type.1.4.0.so'), 'BLOB-CONTENT');
    const { source } = rewriteLinkedAddons(original, LIB_DIR);

    expect(source.endsWith('BLOB-CONTENT')).toBe(true);
    const newlineIndex = source.indexOf('\n');
    const headerLength = Number(source.slice(0, newlineIndex));
    // The prefix counts the newline plus the header JSON, and the blob
    // starts exactly after them.
    expect(source[newlineIndex + headerLength]).toBe('B');
  });

  test('trims a trailing slash from the library dir', () => {
    const { source } = rewriteLinkedAddons(
      pack(headerWithAddon('linked:libbare-type.1.4.0.so')),
      LIB_DIR + '/',
    );
    expect(source).toContain(`"file://${LIB_DIR}/libbare-type.1.4.0.so"`);
  });

  test('refuses bundles without linked addons', () => {
    expect(() =>
      rewriteLinkedAddons(pack({ version: 0, files: {} }), LIB_DIR),
    ).toThrow(/no linked addons/);
  });

  test('refuses malformed bundles with clear errors', () => {
    expect(() => rewriteLinkedAddons('nonsense', LIB_DIR)).toThrow(/malformed/);
    // Valid prefix but the header JSON never terminates.
    expect(() => rewriteLinkedAddons('5\n{"a"', LIB_DIR)).toThrow(/malformed/);
  });
});
