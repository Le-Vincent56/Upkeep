import { describe, expect, it } from 'vitest';
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
      replanError: null,
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
