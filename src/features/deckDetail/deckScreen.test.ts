import { describe, expect, it } from 'vitest';
import { createFixtureDeckStore } from '../../adapters/fixtureDeckStore';
import { seedIndex } from '../../catalog/seedCatalog';
import type { DeckEdit } from '../../decks/edits';
import type { DeckEntry } from '../../decks/types';
import { CARDS, IDS, walkthroughSnapshot } from '../../planning/fixtures/zukoHydras';
import { arrangeRows, DEFAULT_VIEW_CHOICES, type StatusFilter } from './arrangeRows';
import { displayNames, filteredLine, showingLabel } from './describe';
import {
  loadDeckBuild,
  replanDeckBuild,
  type DeckBuild,
  type DeckBuildReaders,
} from './loadDeckBuild';

const readers: DeckBuildReaders = { ...createFixtureDeckStore(seedIndex), catalog: seedIndex };

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

type Counted = [demand: number, inBox: number, toMove: number, toAcquire: number];

const SOL_RING = {
  avatar: 'c1f93f78-645b-4f21-a80b-5542f3328111',
  commanderMasters: '46ca0b66-a000-4483-b916-f5b89e710244',
} as const;

const MOUNTAIN_ENTRY: DeckEntry = {
  id: IDS.zukoMountain,
  oracleId: 'a3fb7228-e76b-4e96-a40e-20b5fed75685',
  section: 'main',
  quantity: 4,
  printing: null,
};

interface WorkedExample {
  readonly name: string;
  readonly edits: readonly DeckEdit[];
  readonly kept: Counted;
  readonly unprotected: Counted;
}

const WORKED_EXAMPLES: readonly WorkedExample[] = [
  {
    name: 'Mountain quantity 6',
    edits: [{ kind: 'setQuantity', entryId: IDS.zukoMountain, quantity: 6 }],
    kept: [7, 2, 2, 3],
    unprotected: [7, 2, 3, 2],
  },
  {
    name: 'Sol Ring (Main) to Maybeboard',
    edits: [{ kind: 'setSection', entryId: IDS.zukoSolRing, section: 'maybeboard' }],
    kept: [4, 2, 2, 0],
    unprotected: [4, 2, 2, 0],
  },
  {
    name: 'Sol Ring (Main) printing TLE 316',
    edits: [
      {
        kind: 'setPrinting',
        entryId: IDS.zukoSolRing,
        printing: { printingId: SOL_RING.avatar, finish: null },
      },
    ],
    kept: [5, 2, 2, 1],
    unprotected: [5, 2, 2, 1],
  },
  {
    name: 'Sol Ring (Main) printing CMM 410 foil',
    edits: [
      {
        kind: 'setPrinting',
        entryId: IDS.zukoSolRing,
        printing: { printingId: SOL_RING.commanderMasters, finish: 'foil' },
      },
    ],
    kept: [5, 2, 2, 1],
    unprotected: [5, 2, 2, 1],
  },
  {
    name: 'Maybeboard Sol Ring to Main',
    edits: [{ kind: 'setSection', entryId: IDS.zukoMaybeSolRing, section: 'main' }],
    kept: [6, 2, 2, 2],
    unprotected: [6, 2, 3, 1],
  },
  {
    name: 'Remove Mountain',
    edits: [{ kind: 'removeEntry', entryId: IDS.zukoMountain }],
    kept: [1, 0, 0, 1],
    unprotected: [1, 0, 1, 0],
  },
  {
    name: 'Remove Mountain, then put it back',
    edits: [
      { kind: 'removeEntry', entryId: IDS.zukoMountain },
      { kind: 'addEntry', entry: MOUNTAIN_ENTRY, at: 1 },
    ],
    kept: [5, 2, 2, 1],
    unprotected: [5, 2, 3, 0],
  },
];

async function editedBuild(edits: readonly DeckEdit[], protectedIds: readonly string[]) {
  const store = createFixtureDeckStore(seedIndex);
  const storeReaders: DeckBuildReaders = { ...store, catalog: seedIndex };
  for (const edit of edits) await store.deckWriter.editDeck(IDS.zuko, edit);

  return replanDeckBuild(storeReaders, await loadDeckBuild(storeReaders, IDS.zuko), protectedIds);
}

function counted(build: DeckBuild): Counted {
  const { demand, inBox, toMove, toAcquire } = build.plannedDeck.counts;
  return [demand, inBox, toMove, toAcquire];
}

describe('deck editing walkthrough', () => {
  it.each(WORKED_EXAMPLES)('$name', async ({ edits, kept, unprotected }) => {
    expect(counted(await editedBuild(edits, [IDS.hydras]))).toEqual(kept);
    expect(counted(await editedBuild(edits, []))).toEqual(unprotected);
  });

  it('explains the Mountains Zuko no longer owns', async () => {
    const build = await editedBuild(WORKED_EXAMPLES[0]?.edits ?? [], [IDS.hydras]);

    expect(linesUnder(build, 'toAcquire')).toContain('2 to acquire · not enough owned · 6 wanted');
  });

  it('stops counting the Hydras Sol Ring once Zuko wants the TLE 316 printing', async () => {
    const build = await editedBuild(WORKED_EXAMPLES[2]?.edits ?? [], []);

    expect(linesUnder(build, 'toAcquire')).toEqual(['1 to acquire · not enough owned · 1 wanted']);
    expect(linesUnder(build, 'toMove')).toEqual(['2 to move from Binder · 4 wanted']);
  });
});

const ADDED_CARDS = {
  fireLordZuko: 'a129423d-c886-4120-96f7-c2517ea7eb83',
  solTalisman: '867f0cdf-cf75-40f0-bf1e-ccb92e55e9a3',
} as const;

function added(
  oracleId: string,
  section: DeckEntry['section'],
  quantity: number,
  printing: DeckEntry['printing'] = null,
): DeckEdit {
  return { kind: 'addCard', entry: { id: 'entry-added', oracleId, section, quantity, printing } };
}

const ADDING_EXAMPLES: readonly WorkedExample[] = [
  {
    name: 'Fire Lord Zuko ×1 to Commander',
    edits: [added(ADDED_CARDS.fireLordZuko, 'commander', 1)],
    kept: [6, 2, 2, 2],
    unprotected: [6, 2, 3, 1],
  },
  {
    name: 'Sol Ring ×1 to Main raises it',
    edits: [added(CARDS.solRing, 'main', 1)],
    kept: [6, 2, 2, 2],
    unprotected: [6, 2, 3, 1],
  },
  {
    name: 'cmm 410 ×1 to Main is a new entry',
    edits: [
      added(CARDS.solRing, 'main', 1, { printingId: SOL_RING.commanderMasters, finish: null }),
    ],
    kept: [6, 2, 2, 2],
    unprotected: [6, 2, 3, 1],
  },
  {
    name: 'Mountain ×3 to Main raises it to 7',
    edits: [added(CARDS.mountain, 'main', 3)],
    kept: [8, 2, 2, 4],
    unprotected: [8, 2, 3, 3],
  },
  {
    name: 'tle 316 ×1 to Maybeboard raises the idea',
    edits: [added(CARDS.solRing, 'maybeboard', 1, { printingId: SOL_RING.avatar, finish: null })],
    kept: [5, 2, 2, 1],
    unprotected: [5, 2, 3, 0],
  },
  {
    name: 'Sol Talisman ×1 to Sideboard',
    edits: [added(ADDED_CARDS.solTalisman, 'sideboard', 1)],
    kept: [6, 2, 2, 2],
    unprotected: [6, 2, 3, 1],
  },
];

describe('adding to a deck walkthrough', () => {
  it.each(ADDING_EXAMPLES)('$name', async ({ edits, kept, unprotected }) => {
    expect(counted(await editedBuild(edits, [IDS.hydras]))).toEqual(kept);
    expect(counted(await editedBuild(edits, []))).toEqual(unprotected);
  });

  it('keeps one Main Sol Ring row, at ×2, after adding Sol Ring to Main', async () => {
    const build = await editedBuild(ADDING_EXAMPLES[1]?.edits ?? [], [IDS.hydras]);
    const solRings = build.rows.filter(
      (row) => row.oracleId === CARDS.solRing && row.section === 'main',
    );

    expect(solRings.map((row) => [row.entryId, row.quantity])).toEqual([[IDS.zukoSolRing, 2]]);
  });

  it('gives the exact CMM copy the Hydras Sol Ring before the any-printing entry', async () => {
    const build = await editedBuild(ADDING_EXAMPLES[2]?.edits ?? [], []);

    expect(linesUnder(build, 'toMove')).toContain(
      '1 to move from Hydras box · leaves Hydras short · 1 wanted',
    );
    expect(linesUnder(build, 'toAcquire')).toEqual([
      '1 to acquire · used by another entry in this deck · 1 wanted',
    ]);
  });
});

describe('editing the game plan walkthrough', () => {
  it('keeps the saved game plan through Keep together and an addition, without replanning it', async () => {
    const store = createFixtureDeckStore(seedIndex);
    const storeReaders: DeckBuildReaders = { ...store, catalog: seedIndex };
    const revision = async () =>
      (
        await store.buildSnapshots.loadBuildSnapshot({
          targetDeckIds: [IDS.zuko],
          protectedDeckIds: [],
        })
      ).revision;

    await store.deckWriter.setGamePlan(IDS.zuko, 'Go wide, then swing.');
    const saved = await loadDeckBuild(storeReaders, IDS.zuko);
    expect(saved.detail.gamePlan).toBe('Go wide, then swing.');
    expect(counted(saved)).toEqual([5, 2, 2, 1]);
    expect(await revision()).toBe(1);

    const unprotected = await replanDeckBuild(storeReaders, saved, []);
    expect(unprotected.detail.gamePlan).toBe('Go wide, then swing.');
    expect(counted(unprotected)).toEqual([5, 2, 3, 0]);
    expect(await revision()).toBe(1);

    await store.deckWriter.editDeck(IDS.zuko, added(CARDS.solRing, 'main', 1));
    const grown = await replanDeckBuild(storeReaders, unprotected, []);
    expect(grown.detail.gamePlan).toBe('Go wide, then swing.');
    expect(counted(grown)).toEqual([6, 2, 3, 1]);
    expect(await revision()).toBe(2);
  });

  it('stores a messy game plan as one paragraph, and an empty one as nothing', async () => {
    const store = createFixtureDeckStore(seedIndex);

    await store.deckWriter.setGamePlan(IDS.zuko, '  Ramp.\n\nThen   win.  ');
    expect((await store.deckDetails.loadDeckDetail(IDS.zuko)).gamePlan).toBe('Ramp. Then win.');

    await store.deckWriter.setGamePlan(IDS.zuko, '');
    expect((await store.deckDetails.loadDeckDetail(IDS.zuko)).gamePlan).toBe('');
  });
});
