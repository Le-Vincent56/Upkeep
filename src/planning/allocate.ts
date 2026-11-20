import { compareText, demandOf, qualifies } from './rules';
import type {
  AllocationChoices,
  BuildSnapshot,
  MoveReason,
  SnapshotDeck,
  SnapshotEntry,
  StockRow,
} from './types';

interface DrawBase {
  readonly deckId: string;
  readonly entryId: string;
  readonly row: StockRow;
  readonly quantity: number;
  readonly boxDeckId: string | null;
}

export interface HoldDraw extends DrawBase {
  readonly kind: 'protected' | 'keep';
}

export interface FillDraw extends DrawBase {
  readonly kind: 'fill';
  readonly reason: MoveReason;
}

export type Draw = HoldDraw | FillDraw;

export interface Allocated {
  readonly draws: readonly Draw[];
  readonly shortfalls: ReadonlyMap<string, number>;
}

interface Slot {
  readonly row: StockRow;
  readonly boxDeckId: string | null;
  free: number;
  soft: number;
}

interface Selection {
  readonly targets: readonly SnapshotDeck[];
  readonly reservers: readonly SnapshotDeck[];
  readonly protectedIds: ReadonlySet<string>;
  readonly choices: AllocationChoices;
}

interface Demand {
  readonly deck: SnapshotDeck;
  readonly entry: SnapshotEntry;
}

function compareRows(a: StockRow, b: StockRow): number {
  return (
    compareText(a.locationId, b.locationId) ||
    compareText(a.printingId, b.printingId) ||
    compareText(a.finish, b.finish)
  );
}

function compareEntries(a: SnapshotEntry, b: SnapshotEntry): number {
  const exactFirst = Number(b.printing !== null) - Number(a.printing !== null);
  return exactFirst || compareText(a.id, b.id);
}

function takeUpTo(
  slots: readonly Slot[],
  need: number,
  from: 'free' | 'soft',
  onTake: (slot: Slot, quantity: number) => void,
): number {
  let remaining = need;
  for (const slot of slots) {
    if (remaining === 0) break;
    const quantity = Math.min(remaining, slot[from]);
    if (quantity === 0) continue;

    // Every take subtracts from the pool, so a stock quantity satisfies demand only once.
    slot[from] -= quantity;
    remaining -= quantity;
    onTake(slot, quantity);
  }

  return remaining;
}

function hold(
  kind: HoldDraw['kind'],
  deck: SnapshotDeck,
  entry: SnapshotEntry,
  slot: Slot,
  quantity: number,
): HoldDraw {
  return {
    kind,
    deckId: deck.id,
    entryId: entry.id,
    row: slot.row,
    quantity,
    boxDeckId: slot.boxDeckId,
  };
}

function fill(
  reason: MoveReason,
  deck: SnapshotDeck,
  entry: SnapshotEntry,
  slot: Slot,
  quantity: number,
): FillDraw {
  return {
    kind: 'fill',
    reason,
    deckId: deck.id,
    entryId: entry.id,
    row: slot.row,
    quantity,
    boxDeckId: slot.boxDeckId,
  };
}

function demandOrder(
  oracleId: string,
  selection: Selection,
  entriesOf: (deck: SnapshotDeck) => SnapshotEntry[],
): Demand[] {
  const chosen: SnapshotDeck[] = [];
  for (const choice of selection.choices.priority) {
    if (choice.oracleId !== oracleId) continue;
    const deck = selection.targets.find((target) => target.id === choice.deckId);
    if (deck !== undefined && !chosen.includes(deck)) chosen.push(deck);
  }

  const others = selection.targets.filter((deck) => !chosen.includes(deck));
  const demandsOf = (deck: SnapshotDeck, exact: boolean): Demand[] =>
    entriesOf(deck)
      .filter((entry) => (entry.printing !== null) === exact)
      .map((entry) => ({ deck, entry }));

  return [
    ...chosen.flatMap((deck) => entriesOf(deck).map((entry) => ({ deck, entry }))),
    ...others.flatMap((deck) => demandsOf(deck, true)),
    ...others.flatMap((deck) => demandsOf(deck, false)),
  ];
}

function allocateCard(
  oracleId: string,
  slots: readonly Slot[],
  selection: Selection,
  draws: Draw[],
  shortfalls: Map<string, number>,
): void {
  const entriesOf = (deck: SnapshotDeck): SnapshotEntry[] =>
    deck.entries
      .filter((entry) => entry.oracleId === oracleId && demandOf(entry) > 0)
      .sort(compareEntries);
  const inBoxOf = (deck: SnapshotDeck): Slot[] =>
    slots.filter((slot) => slot.row.locationId === deck.boxLocationId);

  const exactlyWanted = new Set(
    selection.targets.flatMap((deck) =>
      entriesOf(deck).flatMap((entry) =>
        entry.printing === null ? [] : [entry.printing.printingId],
      ),
    ),
  );

  const candidates = (entry: SnapshotEntry, pool: readonly Slot[]): Slot[] => {
    const rank = (slot: Slot) =>
      (entry.printing === null && exactlyWanted.has(slot.row.printingId) ? 2 : 0) +
      (slot.boxDeckId === null ? 0 : 1);

    return pool.filter((slot) => qualifies(slot.row, entry)).sort((a, b) => rank(a) - rank(b));
  };

  for (const deck of selection.reservers) {
    const locked = selection.protectedIds.has(deck.id);
    const own = inBoxOf(deck);
    for (const entry of entriesOf(deck)) {
      takeUpTo(candidates(entry, own), demandOf(entry), 'free', (slot, quantity) => {
        if (locked) draws.push(hold('protected', deck, entry, slot, quantity));
        else slot.soft += quantity;
      });
    }
  }

  const unmet = new Map<SnapshotEntry, number>();
  for (const deck of selection.targets) {
    const own = inBoxOf(deck);
    for (const entry of entriesOf(deck)) {
      const left = takeUpTo(candidates(entry, own), demandOf(entry), 'free', (slot, quantity) =>
        draws.push(hold('keep', deck, entry, slot, quantity)),
      );
      unmet.set(entry, left);
    }
  }

  for (const { deck, entry } of demandOrder(oracleId, selection, entriesOf)) {
    const pool = candidates(entry, slots);
    const fromFree = (slot: Slot, quantity: number) =>
      draws.push(fill(slot.boxDeckId === null ? 'loose' : 'surplus', deck, entry, slot, quantity));
    const borrow = (slot: Slot, quantity: number) =>
      draws.push(fill('borrowed', deck, entry, slot, quantity));

    let need = unmet.get(entry) ?? 0;
    need = takeUpTo(pool, need, 'free', fromFree);
    need = takeUpTo(pool, need, 'soft', borrow);
    if (need > 0) shortfalls.set(entry.id, need);
  }
}

export function allocate(snapshot: BuildSnapshot, choices: AllocationChoices): Allocated {
  const decksById = new Map(snapshot.decks.map((deck) => [deck.id, deck] as const));
  const targetIds = new Set(snapshot.targetDeckIds);
  const boxOwners = new Map(
    snapshot.decks.flatMap((deck) =>
      deck.boxLocationId === null ? [] : [[deck.boxLocationId, deck.id] as const],
    ),
  );

  const selection: Selection = {
    targets: snapshot.targetDeckIds.flatMap((id) => decksById.get(id) ?? []),
    reservers: snapshot.decks
      .filter((deck) => deck.boxLocationId !== null && !targetIds.has(deck.id))
      .sort((a, b) => compareText(a.id, b.id)),
    protectedIds: new Set(snapshot.protectedDeckIds),
    choices,
  };
  const slots: Slot[] = [...snapshot.stock].sort(compareRows).map((row) => ({
    row,
    boxDeckId: boxOwners.get(row.locationId) ?? null,
    free: row.quantity,
    soft: 0,
  }));
  const cards = new Set(
    selection.targets.flatMap((deck) =>
      deck.entries.filter((entry) => demandOf(entry) > 0).map((entry) => entry.oracleId),
    ),
  );

  const draws: Draw[] = [];
  const shortfalls = new Map<string, number>();
  for (const oracleId of [...cards].sort(compareText)) {
    const cardSlots = slots.filter((slot) => slot.row.oracleId === oracleId);
    allocateCard(oracleId, cardSlots, selection, draws, shortfalls);
  }

  return { draws, shortfalls };
}
