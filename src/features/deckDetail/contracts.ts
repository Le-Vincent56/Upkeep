import type { Color } from '../../catalog/types';
import type { BuildSnapshot } from '../../planning/types';

export interface BuildSelection {
  readonly targetDeckIds: readonly string[];
  readonly protectedDeckIds: readonly string[];
}

/** Loads one consistent planning snapshot for a selection of target and protected decks. */
export interface BuildSnapshotReader {
  loadBuildSnapshot(selection: BuildSelection): Promise<BuildSnapshot>;
}

export type DeckFormat = 'commander' | 'custom';

export interface DeckSummary {
  readonly id: string;
  readonly name: string;
  readonly hasBox: boolean;
}

export interface LocationName {
  readonly id: string;
  readonly name: string;
}

export interface DeckDetail {
  readonly id: string;
  readonly name: string;
  readonly format: DeckFormat;
  readonly colors: readonly Color[];
  readonly gamePlan: string;
  readonly headerArtPrintingId: string | null;
  readonly decks: readonly DeckSummary[];
  readonly locations: readonly LocationName[];
}

/** Loads what the deck screen shows beyond the plan: header fields and display names. */
export interface DeckDetailReader {
  loadDeckDetail(deckId: string): Promise<DeckDetail>;
}
