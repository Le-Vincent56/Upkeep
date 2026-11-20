import type { DeckBuild } from './loadDeckBuild';

export interface ReadyDeckBuild {
  readonly status: 'ready';
  readonly build: DeckBuild;
  readonly requestedProtectedIds: readonly string[];
  readonly pendingRequest: number | null;
  readonly replanError: string | null;
}

export type DeckBuildState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | ReadyDeckBuild;

export type DeckBuildAction =
  | { readonly type: 'loaded'; readonly build: DeckBuild }
  | { readonly type: 'loadFailed'; readonly message: string }
  | {
      readonly type: 'replanRequested';
      readonly requestId: number;
      readonly protectedDeckIds: readonly string[];
    }
  | { readonly type: 'replanned'; readonly requestId: number; readonly build: DeckBuild }
  | { readonly type: 'replanFailed'; readonly requestId: number; readonly message: string };

export const INITIAL_DECK_BUILD_STATE: DeckBuildState = { status: 'loading' };

// A response for anything but the pending request is ignored, so an older selection never
// replaces a newer one.
function answersPending(state: DeckBuildState, requestId: number): state is ReadyDeckBuild {
  return state.status === 'ready' && state.pendingRequest === requestId;
}

export function deckBuildReducer(state: DeckBuildState, action: DeckBuildAction): DeckBuildState {
  switch (action.type) {
    case 'loaded':
      return {
        status: 'ready',
        build: action.build,
        requestedProtectedIds: action.build.protectedDeckIds,
        pendingRequest: null,
        replanError: null,
      };

    case 'loadFailed':
      return { status: 'failed', message: action.message };

    case 'replanRequested':
      if (state.status !== 'ready') return state;
      return {
        ...state,
        requestedProtectedIds: action.protectedDeckIds,
        pendingRequest: action.requestId,
        replanError: null,
      };

    case 'replanned':
      if (!answersPending(state, action.requestId)) return state;
      return {
        ...state,
        build: action.build,
        requestedProtectedIds: action.build.protectedDeckIds,
        pendingRequest: null,
      };

    case 'replanFailed':
      if (!answersPending(state, action.requestId)) return state;
      return {
        ...state,
        requestedProtectedIds: state.build.protectedDeckIds,
        pendingRequest: null,
        replanError: action.message,
      };
  }
}
