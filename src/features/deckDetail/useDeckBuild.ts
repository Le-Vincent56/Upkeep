import { useEffect, useReducer, useRef } from 'react';
import { useDependencies } from '../../app/dependencies';
import { describeError } from '../../app/describeError';
import { deckBuildReducer, INITIAL_DECK_BUILD_STATE, type DeckBuildState } from './deckBuildState';
import { loadDeckBuild, replanDeckBuild } from './loadDeckBuild';

export interface DeckBuildHandle {
  readonly state: DeckBuildState;
  setProtected(protectedDeckIds: readonly string[]): void;
}

export function useDeckBuild(deckId: string): DeckBuildHandle {
  const dependencies = useDependencies();
  const [state, dispatch] = useReducer(deckBuildReducer, INITIAL_DECK_BUILD_STATE);
  const lastRequest = useRef(0);

  useEffect(() => {
    let ignore = false;
    loadDeckBuild(dependencies, deckId).then(
      (build) => {
        if (!ignore) dispatch({ type: 'loaded', build });
      },
      (error: unknown) => {
        if (!ignore) dispatch({ type: 'loadFailed', message: describeError(error) });
      },
    );

    return () => {
      ignore = true;
    };
  }, [dependencies, deckId]);

  function setProtected(protectedDeckIds: readonly string[]) {
    if (state.status !== 'ready') return;

    lastRequest.current += 1;
    const requestId = lastRequest.current;
    dispatch({ type: 'replanRequested', requestId, protectedDeckIds });
    replanDeckBuild(dependencies, state.build, protectedDeckIds).then(
      (build) => dispatch({ type: 'replanned', requestId, build }),
      (error: unknown) =>
        dispatch({ type: 'replanFailed', requestId, message: describeError(error) }),
    );
  }

  return { state, setProtected };
}
