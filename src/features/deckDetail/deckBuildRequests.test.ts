import { describe, expect, it } from 'vitest';
import { createFixtureDeckStore, type FixtureDeckStore } from '../../adapters/fixtureDeckStore';
import { seedIndex } from '../../catalog/seedCatalog';
import type { DeckWriter } from '../../decks/contracts';
import type { DeckEdit } from '../../decks/edits';
import type { DeckEntry, Section } from '../../decks/types';
import { CARDS, IDS } from '../../planning/fixtures/zukoHydras';
import type { BuildSnapshotReader, DeckDetailReader } from './contracts';
import { createDeckBuildRequests, type DeckBuildRequests } from './deckBuildRequests';
import {
  deckBuildReducer,
  INITIAL_DECK_BUILD_STATE,
  type DeckBuildAction,
  type DeckBuildState,
  type ReadyDeckBuild,
} from './deckBuildState';
import {
  loadDeckBuild,
  replanDeckBuild,
  type DeckBuild,
  type DeckBuildReaders,
} from './loadDeckBuild';

interface Harness {
  readonly requests: DeckBuildRequests;
  readonly actions: DeckBuildAction[];
  readonly readers: DeckBuildReaders;
  readonly store: FixtureDeckStore;
  state(): ReadyDeckBuild;
}

interface HarnessOptions {
  readonly writer?: (store: DeckWriter) => DeckWriter;
  readonly snapshots?: (store: BuildSnapshotReader) => BuildSnapshotReader;
  readonly details?: (store: DeckDetailReader) => DeckDetailReader;
}

async function harness(options: HarnessOptions = {}): Promise<Harness> {
  const store = createFixtureDeckStore(seedIndex);
  const readers: DeckBuildReaders = {
    buildSnapshots: options.snapshots?.(store.buildSnapshots) ?? store.buildSnapshots,
    deckDetails: options.details?.(store.deckDetails) ?? store.deckDetails,
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
    store,
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
        setGamePlan: store.setGamePlan,
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
        setGamePlan: store.setGamePlan,
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

const FIRE_LORD_ZUKO = 'a129423d-c886-4120-96f7-c2517ea7eb83';

function card(id: string, oracleId: string, section: Section, quantity: number): DeckEntry {
  return { id, oracleId, section, quantity, printing: null };
}

describe('addCard', () => {
  it('reports a new entry as added, read back from the store', async () => {
    const { requests, state } = await harness();
    const zuko = card('entry-new', FIRE_LORD_ZUKO, 'commander', 1);

    await expect(requests.addCard(zuko)).resolves.toEqual({ kind: 'added', entry: zuko });
    await requests.settled();
    expect(counted(state().build)).toEqual([6, 2, 2, 2]);
  });

  it('reports a raised entry as merged, with its own ID and new quantity', async () => {
    const { requests } = await harness();

    await expect(requests.addCard(card('entry-new', CARDS.solRing, 'main', 1))).resolves.toEqual({
      kind: 'merged',
      entry: card(IDS.zukoSolRing, CARDS.solRing, 'main', 2),
    });
  });

  it('reports quick additions of one card in order, as one entry', async () => {
    const { requests, state } = await harness();

    const outcomes = Promise.all([
      requests.addCard(card('entry-a', CARDS.solRing, 'main', 1)),
      requests.addCard(card('entry-b', CARDS.solRing, 'main', 1)),
    ]);

    expect(await outcomes).toEqual([
      { kind: 'merged', entry: card(IDS.zukoSolRing, CARDS.solRing, 'main', 2) },
      { kind: 'merged', entry: card(IDS.zukoSolRing, CARDS.solRing, 'main', 3) },
    ]);
    await requests.settled();
    expect(
      state()
        .build.rows.filter((row) => row.oracleId === CARDS.solRing && row.section === 'main')
        .map((row) => row.quantity),
    ).toEqual([3]);
  });

  it('adds a new card once and merges the second quick addition into it', async () => {
    const { requests } = await harness();

    const outcomes = await Promise.all([
      requests.addCard(card('entry-a', FIRE_LORD_ZUKO, 'commander', 1)),
      requests.addCard(card('entry-b', FIRE_LORD_ZUKO, 'commander', 1)),
    ]);

    expect(outcomes).toEqual([
      { kind: 'added', entry: card('entry-a', FIRE_LORD_ZUKO, 'commander', 1) },
      { kind: 'merged', entry: card('entry-a', FIRE_LORD_ZUKO, 'commander', 2) },
    ]);
  });

  it('reports a rejected addition as failed and keeps the plan', async () => {
    const { requests, state } = await harness();

    await expect(requests.addCard(card('entry-new', CARDS.mountain, 'main', 996))).resolves.toEqual(
      {
        kind: 'failed',
        message: 'A quantity must be a whole number from 1 to 999',
      },
    );
    await requests.settled();
    expect(state().editError?.entryId).toBe('entry-new');
    expect(counted(state().build)).toEqual([5, 2, 2, 1]);
  });

  it('reports an addition queued behind a failed write as dropped', async () => {
    let calls = 0;
    const { requests, readers } = await harness({
      writer: (store) => ({
        setGamePlan: store.setGamePlan,
        editDeck: async (deckId, edit) => {
          calls += 1;
          if (calls === 1) throw new Error('disk full');
          await store.editDeck(deckId, edit);
        },
      }),
    });

    requests.edit(setMountains(5));
    const outcome = requests.addCard(card('entry-new', FIRE_LORD_ZUKO, 'commander', 1));

    await expect(outcome).resolves.toEqual({ kind: 'dropped' });
    await requests.settled();
    expect(calls).toBe(1);
    const fresh = await loadDeckBuild(readers, IDS.zuko);
    expect(fresh.rows.some((row) => row.entryId === 'entry-new')).toBe(false);
  });

  it('queues the addition as a waiting edit', async () => {
    const { requests, state } = await harness();
    const zuko = card('entry-new', FIRE_LORD_ZUKO, 'commander', 1);

    const outcome = requests.addCard(zuko);
    expect(state().pendingEdits).toEqual([{ kind: 'addCard', entry: zuko }]);

    await outcome;
    await requests.settled();
    expect(state().pendingEdits).toEqual([]);
  });
});

describe('createDeckBuildRequests game plan', () => {
  async function storedGamePlan(store: FixtureDeckStore): Promise<string> {
    return (await store.deckDetails.loadDeckDetail(IDS.zuko)).gamePlan;
  }

  it('saves without replanning and shows the reloaded detail', async () => {
    const { requests, actions, state } = await harness();
    const planBefore = state().build.plan;

    await expect(requests.setGamePlan('Go wide, then swing.')).resolves.toEqual({
      kind: 'saved',
    });

    expect(actions.map((action) => action.type)).toEqual(['detailReloaded']);
    expect(state().build.detail.gamePlan).toBe('Go wide, then swing.');
    expect(state().build.plan).toBe(planBefore);
  });

  it('lands after the writes made before it', async () => {
    const { requests, actions, store } = await harness();

    requests.edit(setMountains(5));
    const saved = requests.setGamePlan('Go wide, then swing.');

    await expect(saved).resolves.toEqual({ kind: 'saved' });
    const snapshot = await store.buildSnapshots.loadBuildSnapshot({
      targetDeckIds: [IDS.zuko],
      protectedDeckIds: [],
    });
    const zuko = snapshot.decks.find((deck) => deck.id === IDS.zuko);
    expect(zuko?.entries.find((entry) => entry.id === IDS.zukoMountain)?.quantity).toBe(5);

    const types = actions.map((action) => action.type);
    expect(types.indexOf('replanned')).toBeLessThan(types.indexOf('detailReloaded'));
  });

  it('keeps the saved game plan through later edits and Keep together changes', async () => {
    const { requests, readers, state } = await harness();

    void requests.setGamePlan('Go wide, then swing.');
    requests.edit(setMountains(5));
    requests.setProtected([]);
    await requests.settled();

    expect(state().build.detail.gamePlan).toBe('Go wide, then swing.');
    const fresh = await replanDeckBuild(readers, await loadDeckBuild(readers, IDS.zuko), []);
    expect(state().build.plannedDeck).toEqual(fresh.plannedDeck);
  });

  it('still saves when an entry write before it fails', async () => {
    let calls = 0;
    const { requests, store } = await harness({
      writer: (store) => ({
        setGamePlan: store.setGamePlan,
        editDeck: async (deckId, edit) => {
          calls += 1;
          if (calls === 1) throw new Error('disk full');
          await store.editDeck(deckId, edit);
        },
      }),
    });

    requests.edit(setMountains(5));
    await expect(requests.setGamePlan('Ramp.')).resolves.toEqual({ kind: 'saved' });
    await requests.settled();

    expect(await storedGamePlan(store)).toBe('Ramp.');
  });

  it('reports a failed save and drops nothing behind it', async () => {
    const { requests, actions, state } = await harness({
      writer: (store) => ({
        editDeck: store.editDeck,
        setGamePlan: async () => {
          throw new Error('disk full');
        },
      }),
    });

    const saved = requests.setGamePlan('Ramp.');
    requests.edit(setMountains(5));

    await expect(saved).resolves.toEqual({ kind: 'failed', message: 'disk full' });
    await requests.settled();
    const types = actions.map((action) => action.type);
    expect(types).not.toContain('editFailed');
    expect(types).not.toContain('detailReloaded');
    expect(mountainsIn(state().build)).toBe(5);
  });

  it('reports a game plan over 280 characters', async () => {
    const { requests } = await harness();

    await expect(requests.setGamePlan('x'.repeat(281))).resolves.toEqual({
      kind: 'failed',
      message: 'A game plan holds at most 280 characters',
    });
  });

  it('reports a failed re-read after the write landed', async () => {
    let reads = 0;
    const { requests, actions, store } = await harness({
      details: (stored) => ({
        loadDeckDetail: async (deckId) => {
          reads += 1;
          if (reads > 1) throw new Error('offline');
          return stored.loadDeckDetail(deckId);
        },
      }),
    });

    await expect(requests.setGamePlan('Ramp.')).resolves.toEqual({
      kind: 'failed',
      message: 'offline',
    });
    expect(actions.map((action) => action.type)).not.toContain('detailReloaded');
    expect(await storedGamePlan(store)).toBe('Ramp.');
  });
});
