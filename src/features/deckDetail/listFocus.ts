import type { Arrangement } from './arrangeRows';

export type StopKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

const STOP_KEYS: ReadonlySet<string> = new Set<StopKey>(['ArrowDown', 'ArrowUp', 'Home', 'End']);

export function isStopKey(key: string): key is StopKey {
  return STOP_KEYS.has(key);
}

export function stopOrder(arrangement: Arrangement): string[] {
  return arrangement.groups.flatMap((group) => group.rows.map((shown) => shown.row.entryId));
}

export function nextStop(ids: readonly string[], current: string, key: StopKey): string | null {
  const index = ids.indexOf(current);
  if (index === -1) return null;

  switch (key) {
    case 'ArrowDown':
      return ids[index + 1] ?? null;

    case 'ArrowUp':
      return ids[index - 1] ?? null;

    case 'Home':
      return ids[0] ?? null;

    case 'End':
      return ids[ids.length - 1] ?? null;
  }
}

export function listStop(ids: readonly string[], remembered: string | null): string | null {
  if (remembered !== null && ids.includes(remembered)) return remembered;

  return ids[0] ?? null;
}
