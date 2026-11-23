import type { Finish } from '../catalog/types';
import type { ExactPrinting, Section } from '../decks/types';
import type { BuildSnapshot, SnapshotDeck, SnapshotEntry, StockRow } from './types';

export function exact(printingId: string, finish: Finish | null = null): ExactPrinting {
  return { printingId, finish };
}

export function entry(
  id: string,
  oracleId: string,
  quantity: number,
  options: { section?: Section; printing?: ExactPrinting | null } = {},
): SnapshotEntry {
  return {
    id,
    oracleId,
    section: options.section ?? 'main',
    quantity,
    printing: options.printing ?? null,
  };
}

export function deck(
  id: string,
  boxLocationId: string | null,
  entries: readonly SnapshotEntry[],
): SnapshotDeck {
  return { id, boxLocationId, entries };
}

export function stock(
  printingId: string,
  oracleId: string,
  locationId: string,
  quantity: number,
  finish: Finish = 'nonfoil',
): StockRow {
  return { printingId, oracleId, finish, locationId, quantity };
}

export function snapshot(partial: Partial<BuildSnapshot>): BuildSnapshot {
  const decks = partial.decks ?? [];
  const stockRows = partial.stock ?? [];
  const locationIds = new Set([
    ...decks.flatMap((d) => (d.boxLocationId === null ? [] : [d.boxLocationId])),
    ...stockRows.map((row) => row.locationId),
  ]);

  return {
    revision: 1,
    targetDeckIds: [],
    protectedDeckIds: [],
    locations: [...locationIds].sort().map((id) => ({ id })),
    decks,
    stock: stockRows,
    ...partial,
  };
}
