const { chooseMetroPort, isProjectMetro } = require('../../scripts/lib/phone-test-metro.cjs');

const ROOT = '/projects/metevo-app';
const running = (root?: string) => ({ available: false, status: { body: 'packager-status:running', root } });
const free = { available: true, status: null };

describe('phone test Metro port selection', () => {
  test('skips another project on 8081 and selects the next free port', async () => {
    const probe = jest.fn().mockResolvedValueOnce(running('/another/project')).mockResolvedValueOnce(free);
    const onBusy = jest.fn();
    await expect(chooseMetroPort({ root: ROOT, probe, onBusy })).resolves.toEqual({ port: 8082, reuse: false });
    expect(probe.mock.calls).toEqual([[8081], [8082]]);
    expect(onBusy).toHaveBeenCalledWith(8081);
  });

  test('reuses only the same project with a valid encoded root header', async () => {
    const probe = jest.fn().mockResolvedValue(running(encodeURI(ROOT)));
    await expect(chooseMetroPort({ root: ROOT, probe })).resolves.toEqual({ port: 8081, reuse: true });
    expect(probe).toHaveBeenCalledTimes(1);
  });

  test.each([running(), running('%ZZ'), { available: false, status: null }, { available: false, status: { body: 'other server', root: ROOT } }]) (
    'does not reuse an unidentifiable or non-HTTP service', async (occupied) => {
      const probe = jest.fn().mockResolvedValueOnce(occupied).mockResolvedValueOnce(free);
      await expect(chooseMetroPort({ root: ROOT, probe })).resolves.toEqual({ port: 8082, reuse: false });
    },
  );

  test('honors a custom initial port', async () => {
    const probe = jest.fn().mockResolvedValue(free);
    await expect(chooseMetroPort({ root: ROOT, firstPort: 8095, probe })).resolves.toEqual({ port: 8095, reuse: false });
    expect(probe).toHaveBeenCalledWith(8095);
  });

  test.each([0, -1, 65536, 8081.5, NaN])('rejects invalid ports before probing', async (firstPort) => {
    const probe = jest.fn();
    await expect(chooseMetroPort({ root: ROOT, firstPort, probe })).rejects.toThrow('METEVO_METRO_PORT');
    expect(probe).not.toHaveBeenCalled();
  });

  test('limits searching when all ports are occupied', async () => {
    const probe = jest.fn().mockResolvedValue({ available: false, status: null });
    await expect(chooseMetroPort({ root: ROOT, probe })).rejects.toThrow('Nessuna porta');
    expect(probe).toHaveBeenCalledTimes(20);
  });

  test('never probes beyond the maximum TCP port', async () => {
    const probe = jest.fn().mockResolvedValue({ available: false, status: null });
    await expect(chooseMetroPort({ root: ROOT, firstPort: 65535, probe })).rejects.toThrow();
    expect(probe.mock.calls).toEqual([[65535]]);
  });

  test('permission failures propagate instead of being mistaken for a free port', async () => {
    const probe = jest.fn().mockRejectedValue(new Error('Operation not permitted'));
    await expect(chooseMetroPort({ root: ROOT, probe })).rejects.toThrow('Operation not permitted');
  });

  test('a missing or malformed project header is not proof of identity', () => {
    expect(isProjectMetro(null, ROOT)).toBe(false);
    expect(isProjectMetro({ body: 'packager-status:running', root: '%ZZ' }, ROOT)).toBe(false);
  });
});
