import { describeError } from '../../app/describeError';
import type { DeckWriter } from '../../decks/contracts';
import { editedEntryId, findMatchingEntry, type DeckEdit } from '../../decks/edits';
import type { DeckEntry } from '../../decks/types';
import type { DeckBuildAction } from './deckBuildState';
import { replanDeckBuild, type DeckBuild, type DeckBuildReaders } from './loadDeckBuild';

export interface DeckBuildRequestDeps {
  readonly readers: DeckBuildReaders;
  readonly writer: DeckWriter;
  readonly dispatch: (action: DeckBuildAction) => void;
}

export type AddOutcome =
  | { readonly kind: 'added'; readonly entry: DeckEntry }
  | { readonly kind: 'merged'; readonly entry: DeckEntry }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'dropped' };

export interface DeckBuildRequests {
  setProtected(protectedDeckIds: readonly string[]): void;
  edit(edit: DeckEdit): void;
  /** Sends one addCard through the queue and resolves with what the store did with it. */
  addCard(entry: DeckEntry): Promise<AddOutcome>;
  /** Resolves once every request made so far has been written and replanned. */
  settled(): Promise<void>;
}

type WriteResult =
  | { readonly kind: 'written' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'dropped' };

export function createDeckBuildRequests(
  { readers, writer, dispatch }: DeckBuildRequestDeps,
  loaded: DeckBuild,
): DeckBuildRequests {
  const deckId = loaded.detail.id;
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
      if (requestId === lastRequest) requested = lastGood.protectedDeckIds;
      dispatch({ type: 'replanFailed', requestId, message: describeError(error) });
    }
  }

  function request(edit: DeckEdit): number {
    const requestId = nextRequest();
    dispatch({ type: 'editRequested', requestId, edit });
    return requestId;
  }

  // A failed write skips every write queued behind it; one replan then shows what was stored.
  async function write(requestId: number, edit: DeckEdit): Promise<WriteResult> {
    if (requestId < dropBelow) return { kind: 'dropped' };

    try {
      await writer.editDeck(deckId, edit);
      return { kind: 'written' };
    } catch (error) {
      const failedId = nextRequest();
      const message = describeError(error);
      dropBelow = failedId;
      dispatch({ type: 'editFailed', requestId: failedId, entryId: editedEntryId(edit), message });
      await replan(failedId);
      return { kind: 'failed', message };
    }
  }

  async function landing(entry: DeckEntry): Promise<AddOutcome> {
    try {
      const snapshot = await readers.buildSnapshots.loadBuildSnapshot({
        targetDeckIds: [deckId],
        protectedDeckIds: requested,
      });
      const entries = snapshot.decks.find((deck) => deck.id === deckId)?.entries ?? [];
      const added = entries.find((stored) => stored.id === entry.id);
      if (added !== undefined) return { kind: 'added', entry: added };

      const merged = findMatchingEntry(entries, entry);
      return merged === undefined
        ? { kind: 'failed', message: 'The deck has no entry for this card after adding it' }
        : { kind: 'merged', entry: merged };
    } catch (error) {
      return { kind: 'failed', message: describeError(error) };
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
      const requestId = request(edit);
      enqueue(async () => {
        const result = await write(requestId, edit);
        if (result.kind === 'written') await replan(requestId);
      });
    },

    addCard(entry) {
      const edit: DeckEdit = { kind: 'addCard', entry };
      const requestId = request(edit);

      return new Promise((resolve) => {
        enqueue(async () => {
          const result = await write(requestId, edit);
          if (result.kind !== 'written') {
            resolve(result);
            return;
          }

          resolve(await landing(entry));
          await replan(requestId);
        });
      });
    },

    settled: () => queue,
  };
}
