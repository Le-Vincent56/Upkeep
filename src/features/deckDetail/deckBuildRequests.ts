import { describeError } from '../../app/describeError';
import type { DeckWriter } from '../../decks/contracts';
import { editedEntryId, type DeckEdit } from '../../decks/edits';
import type { DeckBuildAction } from './deckBuildState';
import { replanDeckBuild, type DeckBuild, type DeckBuildReaders } from './loadDeckBuild';

export interface DeckBuildRequestDeps {
  readonly readers: DeckBuildReaders;
  readonly writer: DeckWriter;
  readonly dispatch: (action: DeckBuildAction) => void;
}

export interface DeckBuildRequests {
  setProtected(protectedDeckIds: readonly string[]): void;
  edit(edit: DeckEdit): void;
  /** Resolves once every request made so far has been written and replanned. */
  settled(): Promise<void>;
}

export function createDeckBuildRequests(
  { readers, writer, dispatch }: DeckBuildRequestDeps,
  loaded: DeckBuild,
): DeckBuildRequests {
  let queue: Promise<void> = Promise.resolve();
  let lastRequest = 0;
  let dropBelow = 0;
  let requested = loaded.protectedDeckIds;
  let lastGood = loaded;

  function nextRequest(): number {
    lastRequest += 1;
    return lastRequest;
  }

  function enqueue(work: () => Promise<void>) {
    queue = queue.then(work);
  }

  // Only the newest request replans, and only once every write queued before it has landed,
  // so a toggle can't hide an edit and an edit can't undo a toggle.
  async function replan(requestId: number) {
    if (requestId !== lastRequest) return;

    try {
      const build = await replanDeckBuild(readers, lastGood, requested);
      lastGood = build;
      dispatch({ type: 'replanned', requestId, build });
    } catch (error) {
      requested = lastGood.protectedDeckIds;
      dispatch({ type: 'replanFailed', requestId, message: describeError(error) });
    }
  }

  return {
    setProtected(protectedDeckIds) {
      const requestId = nextRequest();
      requested = protectedDeckIds;
      dispatch({ type: 'replanRequested', requestId, protectedDeckIds });
      enqueue(() => replan(requestId));
    },

    edit(edit) {
      const requestId = nextRequest();
      dispatch({ type: 'editRequested', requestId, edit });
      enqueue(async () => {
        if (requestId < dropBelow) return;

        try {
          await writer.editDeck(lastGood.detail.id, edit);
        } catch (error) {
          const failedId = nextRequest();
          dropBelow = failedId;
          dispatch({
            type: 'editFailed',
            requestId: failedId,
            entryId: editedEntryId(edit),
            message: describeError(error),
          });
          await replan(failedId);
          return;
        }

        await replan(requestId);
      });
    },

    settled: () => queue,
  };
}
