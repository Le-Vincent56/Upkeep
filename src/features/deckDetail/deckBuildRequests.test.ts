import { describe, expect, it } from 'vitest';
import { createFixtureDeckStore } from '../../adapters/fixtureDeckStore';
import { seedIndex } from '../../catalog/seedCatalog';
import type { DeckWriter } from '../../decks/contracts';
import type { DeckEdit } from '../../decks/edits';
import { IDS } from '../../planning/fixtures/zukoHydras';
import type { BuildSnapshotReader } from './contracts';
import { createDeckBuildRequests, type DeckBuildRequests } from './deckBuildRequests';
import {
  deckBuildReducer,
  INITIAL_DECK_BUILD_STATE,
  type DeckBuildAction,
  type DeckBuildState,
  type ReadyDeckBuild,
} from './deckBuildState';
import { loadDeckBuild, type DeckBuild, type DeckBuildReaders } from './loadDeckBuild';

interface Harness {
  readonly requests: DeckBuildRequests;
  readonly actions: DeckBuildAction[];
  readonly readers: DeckBuildReaders;
  state(): ReadyDeckBuild;
}

interface HarnessOptions {
  readonly writer?: (store: DeckWriter) => DeckWriter;
  readonly snapshots?: (store: BuildSnapshotReader) => BuildSnapshotReader;
}

async function harness(options: HarnessOptions = {}): Promise<Harness> {
  const store = createFixtureDeckStore(seedIndex);
  const readers: DeckBuildReaders = {
    buildSnapshots: options.snapshots?.(store.buildSnapshots) ?? store.buildSnapshots,
    deckDetails: store.deckDetails,
    catalog: seedIndex,
  };
  const loaded = await loadDeckBuild(readers, IDS.zuko);

  let state: DeckBuildState = deckBuildReducer(INITIAL_DECK_BUILD_STATE, {
    type: 'loaded',
    build: loaded,
  });
  const actions: DeckBuildAction[] = [];
  const dispatch = (action: DeckBuildAction) => {
    actions.push(action);
    state = deckBuildReducer(state, action);
  };

  const requests = createDeckBuildRequests(
    { readers, writer: options.writer?.(store.deckWriter) ?? store.deckWriter, dispatch },
    loaded,
  );

  return {
    requests,
    actions,
    readers,
    state: () => {
      if (state.status !== 'ready') throw new Error(`Expected ready, got ${state.status}`);
      return state;
    },
  };
}

function setMountains(quantity: number): DeckEdit {
  return { kind: 'setQuantity', entryId: IDS.zukoMountain, quantity };
}

function mountainsIn(build: DeckBuild): number | undefined {
  return build.rows.find((row) => row.entryId === IDS.zukoMountain)?.quantity;
}

function counted(build: DeckBuild): number[] {
  const { demand, inBox, toMove, toAcquire } = build.plannedDeck.counts;
  return [demand, inBox, toMove, toAcquire];
}

function replans(actions: readonly DeckBuildAction[]): DeckBuild[] {
  return actions.flatMap((action) => (action.type === 'replanned' ? [action.build] : []));
}

describe('createDeckBuildRequests', () => {
  it('settles quick presses on the last one, replanning once', async () => {
    const { requests, actions, state } = await harness();

    requests.edit(setMountains(5));
    requests.edit(setMountains(6));
    requests.edit(setMountains(7));
    expect(state().pendingEdits).toEqual([setMountains(5), setMountains(6), setMountains(7)]);

    await requests.settled();
    expect(mountainsIn(state().build)).toBe(7);
    expect(state().build.plannedDeck.counts.demand).toBe(8);
    expect(state().pendingEdits).toEqual([]);
    expect(replans(actions)).toHaveLength(1);
  });

  it('keeps an edit made while a Keep together change is settling', async () => {
    const { requests, state } = await harness();

    requests.setProtected([]);
    requests.edit(setMountains(6));
    await requests.settled();

    expect(state().build.protectedDeckIds).toEqual([]);
    expect(counted(state().build)).toEqual([7, 2, 3, 2]);
  });

  it('keeps a Keep together change made while an edit is settling', async () => {
    const { requests, state } = await harness();

    requests.edit(setMountains(6));
    requests.setProtected([]);
    await requests.settled();

    expect(state().build.protectedDeckIds).toEqual([]);
    expect(counted(state().build)).toEqual([7, 2, 3, 2]);
  });

  it('drops the writes queued behind a failed one and shows what was stored', async () => {
    let calls = 0;
    const { requests, actions, readers, state } = await harness({
      writer: (store) => ({
        editDeck: async (deckId, edit) => {
          calls += 1;
          if (calls === 2) throw new Error('disk full');
          await store.editDeck(deckId, edit);
        },
      }),
    });

    requests.edit(setMountains(5));
    requests.edit(setMountains(6));
    requests.edit(setMountains(7));
    await requests.settled();

    expect(calls).toBe(2);
    expect(actions.filter((action) => action.type === 'editFailed')).toHaveLength(1);
    expect(state().editError).toEqual({ entryId: IDS.zukoMountain, message: 'disk full' });
    expect(state().pendingEdits).toEqual([]);
    expect(mountainsIn(state().build)).toBe(5);

    const fresh = await loadDeckBuild(readers, IDS.zuko);
    expect(state().build.plannedDeck).toEqual(fresh.plannedDeck);
  });

  it('runs edits made after a failure', async () => {
    let calls = 0;
    const { requests, state } = await harness({
      writer: (store) => ({
        editDeck: async (deckId, edit) => {
          calls += 1;
          if (calls === 1) throw new Error('disk full');
          await store.editDeck(deckId, edit);
        },
      }),
    });

    requests.edit(setMountains(5));
    await requests.settled();
    requests.edit(setMountains(6));
    await requests.settled();

    expect(mountainsIn(state().build)).toBe(6);
    expect(state().editError).toBeNull();
  });

  it('rolls Keep together back when its replan fails, and plans the next edit with it', async () => {
    let failNext = false;
    const { requests, state } = await harness({
      snapshots: (store) => ({
        loadBuildSnapshot: async (selection) => {
          if (failNext) {
            failNext = false;
            throw new Error('read failed');
          }
          return store.loadBuildSnapshot(selection);
        },
      }),
    });

    failNext = true;
    requests.setProtected([]);
    await requests.settled();
    expect(state().replanError).toBe('read failed');
    expect(state().requestedProtectedIds).toEqual([IDS.hydras]);

    requests.edit(setMountains(6));
    await requests.settled();
    expect(state().build.protectedDeckIds).toEqual([IDS.hydras]);
    expect(counted(state().build)).toEqual([7, 2, 2, 3]);
  });
});
