import type { CatalogIndex } from '../catalog/catalogIndex';
import type { DeckWriter } from '../decks/contracts';
import { applyDeckEdit } from '../decks/edits';
import type { DeckEntry } from '../decks/types';
import type { BuildSnapshotReader, DeckDetailReader } from '../features/deckDetail/contracts';
import { walkthroughSnapshot } from '../planning/fixtures/zukoHydras';
import type { SnapshotDeck } from '../planning/types';
import { WALKTHROUGH_DECK_DETAILS } from './fixtures/walkthroughDecks';

export interface FixtureDeckStore {
  readonly buildSnapshots: BuildSnapshotReader;
  readonly deckDetails: DeckDetailReader;
  readonly deckWriter: DeckWriter;
}

function sameEntries(a: readonly DeckEntry[], b: readonly DeckEntry[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createFixtureDeckStore(catalog: CatalogIndex): FixtureDeckStore {
  const seed = walkthroughSnapshot();
  const decks = new Map<string, SnapshotDeck>(seed.decks.map((deck) => [deck.id, deck]));
  let revision = seed.revision;

  function deckWith(deckId: string): SnapshotDeck {
    const deck = decks.get(deckId);
    if (deck === undefined) throw new Error(`No deck with id ${deckId}`);

    return deck;
  }

  return {
    buildSnapshots: {
      loadBuildSnapshot: async ({ targetDeckIds, protectedDeckIds }) => ({
        ...seed,
        revision,
        stock: seed.stock.map((row) => ({ ...row })),
        targetDeckIds: [...targetDeckIds],
        protectedDeckIds: [...protectedDeckIds],
        decks: [...decks.values()].map((deck) => ({
          ...deck,
          entries: deck.entries.map((entry) => ({ ...entry })),
        })),
      }),
    },

    deckDetails: {
      loadDeckDetail: async (deckId) => {
        const detail = WALKTHROUGH_DECK_DETAILS[deckId];
        if (detail === undefined) throw new Error(`No deck with id ${deckId}`);

        return detail;
      },
    },

    deckWriter: {
      editDeck: async (deckId, edit) => {
        const deck = deckWith(deckId);
        const entries = applyDeckEdit(deck.entries, edit, catalog);
        if (sameEntries(entries, deck.entries)) return;

        decks.set(deckId, { ...deck, entries });
        revision += 1;
      },
    },
  };
}
