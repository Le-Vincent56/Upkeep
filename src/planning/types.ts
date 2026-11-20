import type { Finish } from '../catalog/types';

export type Section = 'commander' | 'main' | 'sideboard' | 'maybeboard';

export interface ExactPrinting {
  readonly printingId: string;
  readonly finish: Finish | null;
}

export interface SnapshotEntry {
  readonly id: string;
  readonly oracleId: string;
  readonly section: Section;
  readonly quantity: number;
  readonly printing: ExactPrinting | null;
}

export interface SnapshotDeck {
  readonly id: string;
  readonly boxLocationId: string | null;
  readonly entries: readonly SnapshotEntry[];
}

export interface SnapshotLocation {
  readonly id: string;
}

export interface StockRow {
  readonly printingId: string;
  readonly oracleId: string;
  readonly finish: Finish;
  readonly locationId: string;
  readonly quantity: number;
}

/** One consistent read of everything a plan needs: the selection, decks, stock, and revision. */
export interface BuildSnapshot {
  readonly revision: number;
  readonly targetDeckIds: readonly string[];
  readonly protectedDeckIds: readonly string[];
  readonly locations: readonly SnapshotLocation[];
  readonly decks: readonly SnapshotDeck[];
  readonly stock: readonly StockRow[];
}

export interface PriorityChoice {
  readonly oracleId: string;
  readonly deckId: string;
}

/** The player's conflict answers: for a card, which target deck is served first. */
export interface AllocationChoices {
  readonly priority: readonly PriorityChoice[];
}

export interface StockSource {
  readonly locationId: string;
  readonly printingId: string;
  readonly finish: Finish;
}

export type MoveReason = 'loose' | 'surplus' | 'borrowed';

export type BlockKind = 'protected' | 'target' | 'otherTarget' | 'sameDeck';

export interface Block {
  readonly kind: BlockKind;
  readonly deckId: string;
  readonly quantity: number;
}

export interface InBoxAllocation {
  readonly status: 'inBox';
  readonly quantity: number;
  readonly source: StockSource;
}

export interface MoveAllocation {
  readonly status: 'toMove';
  readonly quantity: number;
  readonly source: StockSource;
  readonly reason: MoveReason;
  readonly boxDeckId: string | null;
  readonly leavesShortDeckId: string | null;
}

export interface AcquireAllocation {
  readonly status: 'toAcquire';
  readonly quantity: number;
  readonly blockedBy: readonly Block[];
}

export type Allocation = InBoxAllocation | MoveAllocation | AcquireAllocation;

export interface Counts {
  readonly demand: number;
  readonly inBox: number;
  readonly toMove: number;
  readonly toAcquire: number;
}

export interface PlannedEntry {
  readonly entryId: string;
  readonly oracleId: string;
  readonly demand: number;
  readonly allocations: readonly Allocation[];
}

export interface PlannedDeck {
  readonly deckId: string;
  readonly counts: Counts;
  readonly entries: readonly PlannedEntry[];
}

export interface Move {
  readonly printingId: string;
  readonly finish: Finish;
  readonly fromLocationId: string;
  readonly toDeckId: string;
  readonly toLocationId: string | null;
  readonly quantity: number;
  readonly leavesShortDeckId: string | null;
}

export interface BuyLine {
  readonly oracleId: string;
  readonly printingId: string | null;
  readonly finish: Finish | null;
  readonly quantity: number;
  readonly deckIds: readonly string[];
}

export interface Conflict {
  readonly oracleId: string;
  readonly shortDeckIds: readonly string[];
  readonly takenByDeckIds: readonly string[];
}

/** How the target decks could be assembled from one inventory. The only source of readiness. */
export interface BuildPlan {
  readonly revision: number;
  readonly decks: readonly PlannedDeck[];
  readonly moves: readonly Move[];
  readonly buyList: readonly BuyLine[];
  readonly conflicts: readonly Conflict[];
  readonly totals: Counts;
}

/** Computes a plan without changing inventory: the same snapshot and choices give the same plan. */
export type PlanBuild = (snapshot: BuildSnapshot, choices: AllocationChoices) => BuildPlan;
