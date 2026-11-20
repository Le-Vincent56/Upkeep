import { seedIndex } from '../../catalog/seedCatalog';
import { IDS, walkthroughSnapshot } from '../../planning/fixtures/zukoHydras';
import { planBuild } from '../../planning/planBuild';
import type {
  AcquireAllocation,
  Block,
  BuildSnapshot,
  Counts,
  InBoxAllocation,
  MoveAllocation,
  MoveReason,
  PlannedDeck,
} from '../../planning/types';
import { buildDeckRows, type DeckRow } from './deckRows';

export const TEST_PRINTING = 'printing-test';

export function row(overrides: Partial<DeckRow> = {}): DeckRow {
  return {
    entryId: 'entry-test',
    oracleId: 'oracle-test',
    name: 'Test Relic',
    section: 'main',
    quantity: 1,
    demand: 1,
    manaValue: 1,
    manaCost: '{1}',
    typeLine: 'Artifact',
    typeGroup: 'artifact',
    exactPrinting: null,
    exactLabel: null,
    displayPrinting: null,
    allocations: [],
    ...overrides,
  };
}

export function inBox(
  quantity: number,
  locationId: string,
  printingId = TEST_PRINTING,
): InBoxAllocation {
  return { status: 'inBox', quantity, source: { locationId, printingId, finish: 'nonfoil' } };
}

export function toMove(
  quantity: number,
  locationId: string,
  reason: MoveReason,
  extra: { boxDeckId?: string; leavesShortDeckId?: string; printingId?: string } = {},
): MoveAllocation {
  return {
    status: 'toMove',
    quantity,
    source: { locationId, printingId: extra.printingId ?? TEST_PRINTING, finish: 'nonfoil' },
    reason,
    boxDeckId: extra.boxDeckId ?? null,
    leavesShortDeckId: extra.leavesShortDeckId ?? null,
  };
}

export function toAcquire(quantity: number, blockedBy: readonly Block[] = []): AcquireAllocation {
  return { status: 'toAcquire', quantity, blockedBy };
}

export function counts(
  demand: number,
  inBoxCopies = 0,
  toMoveCopies = 0,
  toAcquireCopies = 0,
): Counts {
  return { demand, inBox: inBoxCopies, toMove: toMoveCopies, toAcquire: toAcquireCopies };
}

export interface WalkthroughRows {
  readonly snapshot: BuildSnapshot;
  readonly plannedDeck: PlannedDeck;
  readonly rows: DeckRow[];
}

export function walkthroughRows(protectedIds: readonly string[] = [IDS.hydras]): WalkthroughRows {
  const snapshot = walkthroughSnapshot({ targets: [IDS.zuko], protectedIds });
  const plannedDeck = planBuild(snapshot, { priority: [] }).decks[0];
  if (plannedDeck === undefined) throw new Error('The walkthrough plan has no Zuko result');

  return { snapshot, plannedDeck, rows: buildDeckRows(plannedDeck, snapshot, seedIndex) };
}

export function rowFor(rows: readonly DeckRow[], entryId: string): DeckRow {
  const found = rows.find((candidate) => candidate.entryId === entryId);
  if (found === undefined) throw new Error(`No row for entry ${entryId}`);

  return found;
}
