import type { Finish } from '../catalog/types';

export type Section = 'commander' | 'main' | 'sideboard' | 'maybeboard';

export interface ExactPrinting {
  readonly printingId: string;
  readonly finish: Finish | null;
}

export interface DeckEntry {
  readonly id: string;
  readonly oracleId: string;
  readonly section: Section;
  readonly quantity: number;
  readonly printing: ExactPrinting | null;
}
