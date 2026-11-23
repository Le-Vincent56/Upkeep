import type { DeckEdit } from './edits';

/** Changes one deck's own records (its entries). Never touches stock. */
export interface DeckWriter {
  editDeck(deckId: string, edit: DeckEdit): Promise<void>;
}
