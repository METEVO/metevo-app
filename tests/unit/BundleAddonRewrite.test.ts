import { rewriteLinkedAddons } from '../../src/services/metevo/bundleAddonRewrite';

const LIB_DIR = '/data/app/~~t/app.metevo.wallet-t/lib/arm64';

function pack(header: Record<string, unknown>, blob = '{}'): string {
  const json = JSON.stringify(header);
  // Match bare-bundle v0's real output: "<len>\n<JSON>\n<blob>", where the
  // prefix length counts the leading newline + JSON + separator newline.
  return String(json.length + 2) + '\n' + json + '\n' + blob;
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
    // The prefix counts the leading newline + JSON + separator newline,
    // and the blob starts exactly after them.
    const newlineIndex = source.indexOf('\n');
    const headerLength = Number(source.slice(0, newlineIndex));
    expect(source[newlineIndex + headerLength]).toBe('B');
  });

  test('round-trips a real bare-pack bundle without corrupting file bytes', () => {
    // Simulate bare-bundle v0 exactly: files are byte-addressed slices of
    // the blob, so a wrong blob start shifts every file by one byte.
    const fileA = '{"name":"a","version":"1.0.0"}';
    const fileB = '{"name":"b","version":"2.0.0"}';
    const blob = fileA + fileB;
    const header = {
      version: 0,
      id: null,
      main: '/a.json',
      imports: {},
      resolutions: {
        '/a.json': { '#package': '/package.json', 'bare-type': { addon: 'linked:libbare-type.1.4.0.so' } },
      },
      addons: ['linked:libbare-type.1.4.0.so'],
      assets: [],
      files: {
        '/a.json': { offset: 0, length: fileA.length, mode: 420 },
        '/b.json': { offset: fileA.length, length: fileB.length, mode: 420 },
      },
    };
    const original = pack(header, blob);
    const { source } = rewriteLinkedAddons(original, LIB_DIR);

    // Re-read the rewritten bundle the way bare-bundle does and confirm
    // both files still parse byte-for-byte.
    const nl = source.indexOf('\n');
    const len = Number(source.slice(0, nl));
    const parsedHeader = JSON.parse(source.slice(nl, nl + len));
    const blobStart = nl + len;
    const read = (p: string) =>
      source.slice(blobStart + parsedHeader.files[p].offset, blobStart + parsedHeader.files[p].offset + parsedHeader.files[p].length);
    expect(read('/a.json')).toBe(fileA);
    expect(read('/b.json')).toBe(fileB);
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
