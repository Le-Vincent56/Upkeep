import { useEffect, useReducer, useRef } from 'react';
import { useDependencies } from '../../app/dependencies';
import { describeError } from '../../app/describeError';
import type { DeckEdit } from '../../decks/edits';
import { createDeckBuildRequests, type DeckBuildRequests } from './deckBuildRequests';
import { deckBuildReducer, INITIAL_DECK_BUILD_STATE, type DeckBuildState } from './deckBuildState';
import { loadDeckBuild } from './loadDeckBuild';

export interface DeckBuildHandle {
  readonly state: DeckBuildState;
  setProtected(protectedDeckIds: readonly string[]): void;
  edit(edit: DeckEdit): void;
}

export function useDeckBuild(deckId: string): DeckBuildHandle {
  const dependencies = useDependencies();
  const [state, dispatch] = useReducer(deckBuildReducer, INITIAL_DECK_BUILD_STATE);
  const requests = useRef<DeckBuildRequests | null>(null);

  useEffect(() => {
    let ignore = false;
    loadDeckBuild(dependencies, deckId).then(
      (build) => {
        if (ignore) return;

        requests.current = createDeckBuildRequests(
          { readers: dependencies, writer: dependencies.deckWriter, dispatch },
          build,
        );
        dispatch({ type: 'loaded', build });
      },
      (error: unknown) => {
        if (!ignore) dispatch({ type: 'loadFailed', message: describeError(error) });
      },
    );

    return () => {
      ignore = true;
      requests.current = null;
    };
  }, [dependencies, deckId]);

  return {
    state,
    setProtected: (protectedDeckIds) => requests.current?.setProtected(protectedDeckIds),
    edit: (edit) => requests.current?.edit(edit),
  };
}
