import { describe, expect, it } from 'vitest';
import type { DeckEdit } from '../../decks/edits';
import { IDS } from '../../planning/fixtures/zukoHydras';
import {
  deckBuildReducer,
  INITIAL_DECK_BUILD_STATE,
  type DeckBuildState,
  type ReadyDeckBuild,
} from './deckBuildState';
import type { DeckBuild } from './loadDeckBuild';

function fakeBuild(protectedDeckIds: readonly string[]): DeckBuild {
  return { protectedDeckIds } as unknown as DeckBuild;
}

const kept = fakeBuild([IDS.hydras]);
const unprotected = fakeBuild([]);

function ready(build: DeckBuild = kept): ReadyDeckBuild {
  const state = deckBuildReducer(INITIAL_DECK_BUILD_STATE, { type: 'loaded', build });
  if (state.status !== 'ready') throw new Error('expected ready');

  return state;
}

function readyOf(state: DeckBuildState): ReadyDeckBuild {
  if (state.status !== 'ready') throw new Error(`expected ready, got ${state.status}`);

  return state;
}

describe('deckBuildReducer', () => {
  it('starts loading', () => {
    expect(INITIAL_DECK_BUILD_STATE).toEqual({ status: 'loading' });
  });

  it('becomes ready when loaded', () => {
    expect(ready()).toEqual({
      status: 'ready',
      build: kept,
      requestedProtectedIds: [IDS.hydras],
      pendingRequest: null,
      pendingEdits: [],
      replanError: null,
      editError: null,
    });
  });

  it('fails when the first load fails', () => {
    expect(
      deckBuildReducer(INITIAL_DECK_BUILD_STATE, { type: 'loadFailed', message: 'boom' }),
    ).toEqual({ status: 'failed', message: 'boom' });
  });

  it('records a requested selection and keeps the shown plan', () => {
    const failedBefore: ReadyDeckBuild = { ...ready(), replanError: 'earlier' };
    const state = readyOf(
      deckBuildReducer(failedBefore, {
        type: 'replanRequested',
        requestId: 1,
        protectedDeckIds: [],
      }),
    );

    expect(state.build).toBe(kept);
    expect(state.requestedProtectedIds).toEqual([]);
    expect(state.pendingRequest).toBe(1);
    expect(state.replanError).toBeNull();
  });

  it('ignores a replan request before the deck is ready', () => {
    const action = { type: 'replanRequested', requestId: 1, protectedDeckIds: [] } as const;

    expect(deckBuildReducer(INITIAL_DECK_BUILD_STATE, action)).toBe(INITIAL_DECK_BUILD_STATE);
  });

  it('applies the replan it is waiting for', () => {
    const requested = deckBuildReducer(ready(), {
      type: 'replanRequested',
      requestId: 1,
      protectedDeckIds: [],
    });
    const state = readyOf(
      deckBuildReducer(requested, { type: 'replanned', requestId: 1, build: unprotected }),
    );

    expect(state.build).toBe(unprotected);
    expect(state.requestedProtectedIds).toEqual([]);
    expect(state.pendingRequest).toBeNull();
  });

  it('lets the later of two toggles win, whatever order the answers arrive in', () => {
    const first = deckBuildReducer(ready(), {
      type: 'replanRequested',
      requestId: 1,
      protectedDeckIds: [],
    });
    const second = deckBuildReducer(first, {
      type: 'replanRequested',
      requestId: 2,
      protectedDeckIds: [IDS.hydras],
    });
    const latest = fakeBuild([IDS.hydras]);

    const staleFirst = deckBuildReducer(second, {
      type: 'replanned',
      requestId: 1,
      build: unprotected,
    });
    expect(staleFirst).toBe(second);
    expect(
      readyOf(deckBuildReducer(staleFirst, { type: 'replanned', requestId: 2, build: latest }))
        .build,
    ).toBe(latest);

    const answered = deckBuildReducer(second, { type: 'replanned', requestId: 2, build: latest });
    const staleLast = deckBuildReducer(answered, {
      type: 'replanned',
      requestId: 1,
      build: unprotected,
    });
    expect(staleLast).toBe(answered);
    expect(readyOf(staleLast).build).toBe(latest);
  });

  it('keeps the last good plan when a replan fails', () => {
    const requested = deckBuildReducer(ready(), {
      type: 'replanRequested',
      requestId: 1,
      protectedDeckIds: [],
    });
    const state = readyOf(
      deckBuildReducer(requested, { type: 'replanFailed', requestId: 1, message: 'boom' }),
    );

    expect(state.build).toBe(kept);
    expect(state.requestedProtectedIds).toEqual([IDS.hydras]);
    expect(state.pendingRequest).toBeNull();
    expect(state.replanError).toBe('boom');
  });

  it('ignores a failure for a stale request', () => {
    const first = deckBuildReducer(ready(), {
      type: 'replanRequested',
      requestId: 1,
      protectedDeckIds: [],
    });
    const second = deckBuildReducer(first, {
      type: 'replanRequested',
      requestId: 2,
      protectedDeckIds: [IDS.hydras],
    });

    expect(deckBuildReducer(second, { type: 'replanFailed', requestId: 1, message: 'boom' })).toBe(
      second,
    );
  });
});

describe('deckBuildReducer edits', () => {
  const moreMountains: DeckEdit = { kind: 'setQuantity', entryId: IDS.zukoMountain, quantity: 5 };
  const evenMore: DeckEdit = { kind: 'setQuantity', entryId: IDS.zukoMountain, quantity: 6 };

  it('records an edit and keeps the shown plan', () => {
    const failedBefore: ReadyDeckBuild = {
      ...ready(),
      replanError: 'earlier',
      editError: { entryId: IDS.zukoSolRing, message: 'earlier' },
    };
    const state = readyOf(
      deckBuildReducer(failedBefore, { type: 'editRequested', requestId: 1, edit: moreMountains }),
    );

    expect(state.build).toBe(kept);
    expect(state.pendingRequest).toBe(1);
    expect(state.pendingEdits).toEqual([moreMountains]);
    expect(state.replanError).toBeNull();
    expect(state.editError).toBeNull();
  });

  it('ignores an edit before the deck is ready', () => {
    const action = { type: 'editRequested', requestId: 1, edit: moreMountains } as const;

    expect(deckBuildReducer(INITIAL_DECK_BUILD_STATE, action)).toBe(INITIAL_DECK_BUILD_STATE);
  });

  it('keeps every edit still waiting, newest last, and waits for the newest request', () => {
    const first = deckBuildReducer(ready(), {
      type: 'editRequested',
      requestId: 1,
      edit: moreMountains,
    });
    const second = readyOf(
      deckBuildReducer(first, { type: 'editRequested', requestId: 2, edit: evenMore }),
    );

    expect(second.pendingEdits).toEqual([moreMountains, evenMore]);
    expect(second.pendingRequest).toBe(2);
    expect(deckBuildReducer(second, { type: 'replanned', requestId: 1, build: unprotected })).toBe(
      second,
    );
  });

  it('empties the waiting edits once the newest replan lands', () => {
    const requested = deckBuildReducer(ready(), {
      type: 'editRequested',
      requestId: 1,
      edit: moreMountains,
    });
    const edited = fakeBuild([IDS.hydras]);
    const state = readyOf(
      deckBuildReducer(requested, { type: 'replanned', requestId: 1, build: edited }),
    );

    expect(state.build).toBe(edited);
    expect(state.pendingEdits).toEqual([]);
    expect(state.pendingRequest).toBeNull();
  });

  it('records a failed edit and waits for the replan that follows it', () => {
    const requested = deckBuildReducer(ready(), {
      type: 'editRequested',
      requestId: 1,
      edit: moreMountains,
    });
    const failed = readyOf(
      deckBuildReducer(requested, {
        type: 'editFailed',
        requestId: 2,
        entryId: IDS.zukoMountain,
        message: 'boom',
      }),
    );

    expect(failed.build).toBe(kept);
    expect(failed.pendingEdits).toEqual([]);
    expect(failed.pendingRequest).toBe(2);
    expect(failed.editError).toEqual({ entryId: IDS.zukoMountain, message: 'boom' });

    const refreshed = fakeBuild([IDS.hydras]);
    const state = readyOf(
      deckBuildReducer(failed, { type: 'replanned', requestId: 2, build: refreshed }),
    );
    expect(state.build).toBe(refreshed);
    expect(state.editError).toEqual({ entryId: IDS.zukoMountain, message: 'boom' });
  });

  it('empties the waiting edits when their replan fails', () => {
    const requested = deckBuildReducer(ready(), {
      type: 'editRequested',
      requestId: 1,
      edit: moreMountains,
    });
    const state = readyOf(
      deckBuildReducer(requested, { type: 'replanFailed', requestId: 1, message: 'boom' }),
    );

    expect(state.build).toBe(kept);
    expect(state.pendingEdits).toEqual([]);
    expect(state.replanError).toBe('boom');
  });
});
