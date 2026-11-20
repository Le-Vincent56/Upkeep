import { invoke } from '@tauri-apps/api/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CARDS, IDS, walkthroughSnapshot } from '../planning/fixtures/zukoHydras';
import { FIXTURE_VERSION } from './fixture';
import { loadDependencies } from './index';

// Mirrors @tauri-apps/api 2.12, whose isTauri() reads globalThis.isTauri.
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: () => Boolean(Reflect.get(globalThis, 'isTauri')),
}));

const invokeMock = vi.mocked(invoke);

beforeEach(() => {
  invokeMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadDependencies', () => {
  it('serves fixture runtime info outside Tauri', async () => {
    const dependencies = await loadDependencies(false);

    await expect(dependencies.runtimeInfo.loadRuntimeInfo()).resolves.toEqual({
      adapter: 'fixture',
      version: FIXTURE_VERSION,
    });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('reads runtime info from the get_runtime_info command inside Tauri', async () => {
    invokeMock.mockResolvedValue({ adapter: 'desktop', version: '0.1.0' });
    const dependencies = await loadDependencies(true);

    await expect(dependencies.runtimeInfo.loadRuntimeInfo()).resolves.toEqual({
      adapter: 'desktop',
      version: '0.1.0',
    });
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('get_runtime_info');
  });

  it('passes a command rejection through unchanged', async () => {
    invokeMock.mockRejectedValue('command not found');
    const dependencies = await loadDependencies(true);

    await expect(dependencies.runtimeInfo.loadRuntimeInfo()).rejects.toBe('command not found');
  });

  it('detects a plain browser by default', async () => {
    const dependencies = await loadDependencies();

    await expect(dependencies.runtimeInfo.loadRuntimeInfo()).resolves.toEqual({
      adapter: 'fixture',
      version: FIXTURE_VERSION,
    });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('detects Tauri by default when the runtime flag is set', async () => {
    vi.stubGlobal('isTauri', true);
    invokeMock.mockResolvedValue({ adapter: 'desktop', version: '0.1.0' });
    const dependencies = await loadDependencies();

    await dependencies.runtimeInfo.loadRuntimeInfo();
    expect(invokeMock).toHaveBeenCalledWith('get_runtime_info');
  });
});

describe.each([
  ['fixture', false],
  ['desktop', true],
] as const)('%s deck readers', (_adapter, insideTauri) => {
  it('serves the walkthrough snapshot for a selection', async () => {
    const { buildSnapshots } = await loadDependencies(insideTauri);

    await expect(
      buildSnapshots.loadBuildSnapshot({ targetDeckIds: [IDS.zuko], protectedDeckIds: [] }),
    ).resolves.toEqual(walkthroughSnapshot({ targets: [IDS.zuko], protectedIds: [] }));
  });

  it('serves deck details and rejects an unknown deck', async () => {
    const { deckDetails } = await loadDependencies(insideTauri);

    await expect(deckDetails.loadDeckDetail(IDS.zuko)).resolves.toMatchObject({
      name: 'Zuko Spellslinger',
    });
    await expect(deckDetails.loadDeckDetail('deck-missing')).rejects.toThrow('deck-missing');
  });

  it('wires the seed catalog and the start deck', async () => {
    const { catalog, startDeckId } = await loadDependencies(insideTauri);

    expect(catalog.cardByOracleId(CARDS.mountain)?.name).toBe('Mountain');
    expect(startDeckId).toBe(IDS.zuko);
  });

  it('never calls a native command for deck reads', async () => {
    const { buildSnapshots, deckDetails } = await loadDependencies(insideTauri);

    await buildSnapshots.loadBuildSnapshot({ targetDeckIds: [IDS.zuko], protectedDeckIds: [] });
    await deckDetails.loadDeckDetail(IDS.zuko);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
