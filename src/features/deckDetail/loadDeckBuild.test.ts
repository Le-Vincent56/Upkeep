import { describe, expect, it } from 'vitest';
import { createFixtureDeckStore } from '../../adapters/fixtureDeckStore';
import { DRAFT_DETAIL, HYDRAS_DETAIL, ZUKO_DETAIL } from '../../adapters/fixtures/walkthroughDecks';
import { seedIndex } from '../../catalog/seedCatalog';
import { IDS, walkthroughSnapshot } from '../../planning/fixtures/zukoHydras';
import { PlanningError } from '../../planning/validateSnapshot';
import {
  defaultProtectedIds,
  loadDeckBuild,
  replanDeckBuild,
  type DeckBuildReaders,
} from './loadDeckBuild';

function fixtureReaders(): DeckBuildReaders {
  return { ...createFixtureDeckStore(seedIndex), catalog: seedIndex };
}

describe('defaultProtectedIds', () => {
  it('keeps every other deck with a box together', () => {
    expect(defaultProtectedIds(ZUKO_DETAIL)).toEqual([IDS.hydras]);
    expect(defaultProtectedIds(HYDRAS_DETAIL)).toEqual([IDS.zuko]);
    expect(defaultProtectedIds(DRAFT_DETAIL)).toEqual([IDS.zuko, IDS.hydras]);
  });
});

describe('loadDeckBuild', () => {
  it('loads Zuko with Hydras kept together', async () => {
    const build = await loadDeckBuild(fixtureReaders(), IDS.zuko);

    expect(build.detail.name).toBe('Zuko Spellslinger');
    expect(build.protectedDeckIds).toEqual([IDS.hydras]);
    expect(build.plannedDeck.counts).toEqual({ demand: 5, inBox: 2, toMove: 2, toAcquire: 1 });
    expect(build.rows).toHaveLength(3);
  });

  it('replans without Hydras', async () => {
    const readers = fixtureReaders();
    const build = await loadDeckBuild(readers, IDS.zuko);
    const replanned = await replanDeckBuild(readers, build, []);

    expect(replanned.protectedDeckIds).toEqual([]);
    expect(replanned.plannedDeck.counts).toEqual({ demand: 5, inBox: 2, toMove: 3, toAcquire: 0 });
    expect(replanned.detail).toBe(build.detail);
  });

  it('rejects when the detail read rejects', async () => {
    await expect(loadDeckBuild(fixtureReaders(), 'deck-missing')).rejects.toThrow('deck-missing');
  });

  it('rejects with the PlanningError when the snapshot is inconsistent', async () => {
    const readers: DeckBuildReaders = {
      ...fixtureReaders(),
      buildSnapshots: {
        loadBuildSnapshot: async () =>
          walkthroughSnapshot({ targets: [IDS.zuko], protectedIds: [IDS.draft] }),
      },
    };

    await expect(loadDeckBuild(readers, IDS.zuko)).rejects.toBeInstanceOf(PlanningError);
  });
});
