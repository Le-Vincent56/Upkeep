import type { Finish } from '../catalog/types';
import type { Allocated, Draw, FillDraw } from './allocate';
import { compareText, demandOf, qualifies } from './rules';
import type {
  Allocation,
  Block,
  BlockKind,
  BuildPlan,
  BuildSnapshot,
  BuyLine,
  Conflict,
  Counts,
  Move,
  MoveAllocation,
  PlannedDeck,
  PlannedEntry,
  SnapshotDeck,
  SnapshotEntry,
  StockRow,
  StockSource,
} from './types';

const BLOCK_ORDER: readonly BlockKind[] = ['protected', 'target', 'otherTarget', 'sameDeck'];

interface MoveLine {
  readonly row: StockRow;
  readonly toDeckId: string;
  readonly leavesShortDeckId: string | null;
  quantity: number;
}

interface BuyTally {
  readonly oracleId: string;
  readonly printingId: string | null;
  readonly finish: Finish | null;
  quantity: number;
  readonly deckIds: string[];
}

function compareOptionalText(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return compareText(a, b);
}

function sourceOf(row: StockRow): StockSource {
  return { locationId: row.locationId, printingId: row.printingId, finish: row.finish };
}

function leavesShort(draw: FillDraw): string | null {
  return draw.reason === 'borrowed' ? draw.boxDeckId : null;
}

function moveAllocation(draw: FillDraw): MoveAllocation {
  return {
    status: 'toMove',
    quantity: draw.quantity,
    source: sourceOf(draw.row),
    reason: draw.reason,
    boxDeckId: draw.boxDeckId,
    leavesShortDeckId: leavesShort(draw),
  };
}

function blockKind(draw: Draw, deckId: string): BlockKind {
  if (draw.kind === 'protected') return 'protected';
  if (draw.deckId === deckId) return 'sameDeck';

  return draw.kind === 'keep' ? 'target' : 'otherTarget';
}

function blocksFor(deck: SnapshotDeck, entry: SnapshotEntry, draws: readonly Draw[]): Block[] {
  const blocks = new Map<string, Block>();
  for (const draw of draws) {
    if (draw.entryId === entry.id || !qualifies(draw.row, entry)) continue;
    const kind = blockKind(draw, deck.id);
    const key = `${kind} ${draw.deckId}`;
    const quantity = (blocks.get(key)?.quantity ?? 0) + draw.quantity;
    blocks.set(key, { kind, deckId: draw.deckId, quantity });
  }

  return [...blocks.values()].sort(
    (a, b) =>
      BLOCK_ORDER.indexOf(a.kind) - BLOCK_ORDER.indexOf(b.kind) || compareText(a.deckId, b.deckId),
  );
}

function planEntry(deck: SnapshotDeck, entry: SnapshotEntry, allocated: Allocated): PlannedEntry {
  const own = allocated.draws.filter((draw) => draw.entryId === entry.id);
  const allocations: Allocation[] = [
    ...own
      .filter((draw) => draw.kind === 'keep')
      .map((draw): Allocation => ({
        status: 'inBox',
        quantity: draw.quantity,
        source: sourceOf(draw.row),
      })),
    ...own.filter((draw) => draw.kind === 'fill').map(moveAllocation),
  ];

  const short = allocated.shortfalls.get(entry.id) ?? 0;
  if (short > 0) {
    allocations.push({
      status: 'toAcquire',
      quantity: short,
      blockedBy: blocksFor(deck, entry, allocated.draws),
    });
  }

  return { entryId: entry.id, oracleId: entry.oracleId, demand: demandOf(entry), allocations };
}

function countsOf(entries: readonly PlannedEntry[]): Counts {
  const counts = { demand: 0, inBox: 0, toMove: 0, toAcquire: 0 };
  for (const entry of entries) {
    counts.demand += entry.demand;
    for (const allocation of entry.allocations) counts[allocation.status] += allocation.quantity;
  }

  return counts;
}

function sumCounts(all: readonly Counts[]): Counts {
  return all.reduce(
    (sum, counts) => ({
      demand: sum.demand + counts.demand,
      inBox: sum.inBox + counts.inBox,
      toMove: sum.toMove + counts.toMove,
      toAcquire: sum.toAcquire + counts.toAcquire,
    }),
    { demand: 0, inBox: 0, toMove: 0, toAcquire: 0 },
  );
}

function movesOf(snapshot: BuildSnapshot, draws: readonly Draw[]): Move[] {
  const lines = new Map<string, MoveLine>();
  for (const draw of draws) {
    if (draw.kind !== 'fill') continue;
    const leavesShortDeckId = leavesShort(draw);
    const { locationId, printingId, finish } = draw.row;
    const key = [locationId, printingId, finish, draw.deckId, leavesShortDeckId].join(' ');
    const line = lines.get(key);
    if (line === undefined) {
      lines.set(key, {
        row: draw.row,
        toDeckId: draw.deckId,
        leavesShortDeckId,
        quantity: draw.quantity,
      });
    } else {
      line.quantity += draw.quantity;
    }
  }

  const selectionOrder = (deckId: string) => snapshot.targetDeckIds.indexOf(deckId);
  const boxOf = (deckId: string) =>
    snapshot.decks.find((deck) => deck.id === deckId)?.boxLocationId ?? null;

  return [...lines.values()]
    .sort(
      (a, b) =>
        compareText(a.row.locationId, b.row.locationId) ||
        compareText(a.row.oracleId, b.row.oracleId) ||
        compareText(a.row.printingId, b.row.printingId) ||
        compareText(a.row.finish, b.row.finish) ||
        selectionOrder(a.toDeckId) - selectionOrder(b.toDeckId) ||
        compareOptionalText(a.leavesShortDeckId, b.leavesShortDeckId),
    )
    .map((line) => ({
      printingId: line.row.printingId,
      finish: line.row.finish,
      fromLocationId: line.row.locationId,
      toDeckId: line.toDeckId,
      toLocationId: boxOf(line.toDeckId),
      quantity: line.quantity,
      leavesShortDeckId: line.leavesShortDeckId,
    }));
}

function buyListOf(
  targets: readonly SnapshotDeck[],
  shortfalls: ReadonlyMap<string, number>,
): BuyLine[] {
  const lines = new Map<string, BuyTally>();
  for (const deck of targets) {
    for (const entry of deck.entries) {
      const short = shortfalls.get(entry.id) ?? 0;
      if (short === 0) continue;

      const printingId = entry.printing?.printingId ?? null;
      const finish = entry.printing?.finish ?? null;
      const key = [entry.oracleId, printingId, finish].join(' ');
      let line = lines.get(key);
      if (line === undefined) {
        line = { oracleId: entry.oracleId, printingId, finish, quantity: 0, deckIds: [] };
        lines.set(key, line);
      }
      line.quantity += short;
      if (!line.deckIds.includes(deck.id)) line.deckIds.push(deck.id);
    }
  }

  return [...lines.values()].sort(
    (a, b) =>
      compareText(a.oracleId, b.oracleId) ||
      compareOptionalText(a.printingId, b.printingId) ||
      compareOptionalText(a.finish, b.finish),
  );
}

function conflictsOf(targets: readonly SnapshotDeck[], allocated: Allocated): Conflict[] {
  const fills = allocated.draws.filter((draw) => draw.kind === 'fill');
  const byCard = new Map<string, { short: Set<string>; takenBy: Set<string> }>();
  for (const deck of targets) {
    for (const entry of deck.entries) {
      if (!allocated.shortfalls.has(entry.id)) continue;
      const takers = fills.filter((draw) => draw.deckId !== deck.id && qualifies(draw.row, entry));
      if (takers.length === 0) continue;

      const conflict = byCard.get(entry.oracleId) ?? { short: new Set(), takenBy: new Set() };
      conflict.short.add(deck.id);
      for (const taker of takers) conflict.takenBy.add(taker.deckId);
      byCard.set(entry.oracleId, conflict);
    }
  }

  const inSelectionOrder = (ids: ReadonlySet<string>) =>
    targets.map((deck) => deck.id).filter((id) => ids.has(id));

  return [...byCard]
    .sort(([a], [b]) => compareText(a, b))
    .map(([oracleId, conflict]) => ({
      oracleId,
      shortDeckIds: inSelectionOrder(conflict.short),
      takenByDeckIds: inSelectionOrder(conflict.takenBy),
    }));
}

export function assemblePlan(snapshot: BuildSnapshot, allocated: Allocated): BuildPlan {
  const decksById = new Map(snapshot.decks.map((deck) => [deck.id, deck] as const));
  const targets = snapshot.targetDeckIds.flatMap((id) => decksById.get(id) ?? []);
  const decks: PlannedDeck[] = targets.map((deck) => {
    const entries = deck.entries.map((entry) => planEntry(deck, entry, allocated));
    return { deckId: deck.id, counts: countsOf(entries), entries };
  });

  return {
    revision: snapshot.revision,
    decks,
    moves: movesOf(snapshot, allocated.draws),
    buyList: buyListOf(targets, allocated.shortfalls),
    conflicts: conflictsOf(targets, allocated),
    totals: sumCounts(decks.map((deck) => deck.counts)),
  };
}
