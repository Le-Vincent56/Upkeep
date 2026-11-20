import { describe, expect, it } from 'vitest';
import { createFixtureDeckReaders } from '../../adapters/fixture';
import { seedIndex } from '../../catalog/seedCatalog';
import { IDS, walkthroughSnapshot } from '../../planning/fixtures/zukoHydras';
import { arrangeRows, DEFAULT_VIEW_CHOICES, type StatusFilter } from './arrangeRows';
import { displayNames, filteredLine, showingLabel } from './describe';
import {
  loadDeckBuild,
  replanDeckBuild,
  type DeckBuild,
  type DeckBuildReaders,
} from './loadDeckBuild';

const readers: DeckBuildReaders = { ...createFixtureDeckReaders(), catalog: seedIndex };

function linesUnder(build: DeckBuild, filter: StatusFilter): string[] {
  const names = displayNames(build.detail);
  const arrangement = arrangeRows(build.rows, build.plannedDeck.counts, {
    ...DEFAULT_VIEW_CHOICES,
    filter,
  });

  return arrangement.groups.flatMap((group) =>
    group.rows.flatMap((shown) =>
      shown.allocations.map((allocation) => filteredLine(allocation, shown.row, names, seedIndex)),
    ),
  );
}

describe('deck detail walkthrough', () => {
  it('Hydras kept together: 2 / 2 / 1', async () => {
    const build = await loadDeckBuild(readers, IDS.zuko);
    const { counts } = build.plannedDeck;

    expect([counts.inBox, counts.toMove, counts.toAcquire]).toEqual([2, 2, 1]);
    expect(linesUnder(build, 'toMove')).toEqual(['2 to move from Binder · 4 wanted']);
    expect(linesUnder(build, 'toAcquire')).toEqual([
      '1 to acquire · Hydras is kept together · 1 wanted',
    ]);

    const moving = arrangeRows(build.rows, counts, { ...DEFAULT_VIEW_CHOICES, filter: 'toMove' });
    expect(showingLabel(moving.shownCopies, moving.deckCopies)).toBe('Showing 2 of 5 cards');
  });

  it('Hydras unprotected: 2 / 3 / 0', async () => {
    const build = await replanDeckBuild(readers, await loadDeckBuild(readers, IDS.zuko), []);
    const { counts } = build.plannedDeck;

    expect([counts.inBox, counts.toMove, counts.toAcquire]).toEqual([2, 3, 0]);
    expect(linesUnder(build, 'toMove')).toEqual([
      '1 to move from Hydras box · leaves Hydras short · 1 wanted',
      '2 to move from Binder · 4 wanted',
    ]);
    expect(linesUnder(build, 'toAcquire')).toEqual([]);
  });

  it('previewing never changes inventory', async () => {
    const stock = walkthroughSnapshot().stock;
    const before = structuredClone(stock);
    const sharedStock: DeckBuildReaders = {
      ...readers,
      buildSnapshots: {
        loadBuildSnapshot: async ({ targetDeckIds, protectedDeckIds }) => ({
          ...walkthroughSnapshot({ targets: targetDeckIds, protectedIds: protectedDeckIds }),
          stock,
        }),
      },
    };

    await replanDeckBuild(sharedStock, await loadDeckBuild(sharedStock, IDS.zuko), []);
    expect(stock).toEqual(before);
  });
});
