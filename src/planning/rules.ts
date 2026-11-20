import type { SnapshotEntry, StockRow } from './types';

export function compareText(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

export function demandOf(entry: SnapshotEntry): number {
  return entry.section === 'maybeboard' ? 0 : entry.quantity;
}

export function qualifies(row: StockRow, entry: SnapshotEntry): boolean {
  if (row.oracleId !== entry.oracleId) return false;
  if (entry.printing === null) return true;

  const { printingId, finish } = entry.printing;
  return row.printingId === printingId && (finish === null || row.finish === finish);
}
