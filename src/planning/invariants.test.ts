import { describe, expect, it } from 'vitest';
import { planBuild } from './planBuild';
import { allCases } from './planningCases';
import type { BuildPlan, BuildSnapshot } from './types';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function reversed(snapshot: BuildSnapshot): BuildSnapshot {
  return {
    ...snapshot,
    locations: [...snapshot.locations].reverse(),
    stock: [...snapshot.stock].reverse(),
    decks: [...snapshot.decks].reverse().map((d) => ({ ...d, entries: [...d.entries].reverse() })),
  };
}

function rotate<T>(items: readonly T[]): T[] {
  return [...items.slice(1), ...items.slice(0, 1)];
}

function rotated(snapshot: BuildSnapshot): BuildSnapshot {
  return {
    ...snapshot,
    locations: rotate(snapshot.locations),
    stock: rotate(snapshot.stock),
    decks: rotate(snapshot.decks).map((d) => ({ ...d, entries: rotate(d.entries) })),
  };
}

function withEntriesById(plan: BuildPlan): BuildPlan {
  return {
    ...plan,
    decks: plan.decks.map((d) => ({
      ...d,
      entries: [...d.entries].sort((a, b) => (a.entryId < b.entryId ? -1 : 1)),
    })),
  };
}

describe.each(allCases())('invariants: %s', (_name, { snapshot, choices }) => {
  it('balances every target', () => {
    const plan = planBuild(snapshot, choices);
    for (const deck of plan.decks) {
      const { demand, inBox, toMove, toAcquire } = deck.counts;
      expect(inBox + toMove + toAcquire).toBe(demand);
      for (const entry of deck.entries) {
        const allocated = entry.allocations.reduce((sum, a) => sum + a.quantity, 0);
        expect(allocated).toBe(entry.demand);
      }
    }
  });

  it('never uses a stock quantity twice', () => {
    const plan = planBuild(snapshot, choices);
    const used = new Map<string, number>();
    for (const allocation of plan.decks.flatMap((d) => d.entries.flatMap((e) => e.allocations))) {
      if (allocation.status === 'toAcquire') continue;
      const { locationId, printingId, finish } = allocation.source;
      const key = `${locationId} ${printingId} ${finish}`;
      used.set(key, (used.get(key) ?? 0) + allocation.quantity);
    }

    for (const [key, quantity] of used) {
      const row = snapshot.stock.find((r) => `${r.locationId} ${r.printingId} ${r.finish}` === key);
      expect(row, `allocation from unknown stock ${key}`).toBeDefined();
      expect(quantity).toBeLessThanOrEqual(row?.quantity ?? 0);
    }
  });

  it('leaves the snapshot untouched', () => {
    const before = structuredClone(snapshot);
    const frozen = deepFreeze(structuredClone(snapshot));

    expect(() => planBuild(frozen, deepFreeze(structuredClone(choices)))).not.toThrow();
    planBuild(snapshot, choices);
    expect(snapshot).toEqual(before);
  });

  it('ignores input order', () => {
    const expected = withEntriesById(planBuild(snapshot, choices));
    expect(withEntriesById(planBuild(reversed(snapshot), choices))).toEqual(expected);
    expect(withEntriesById(planBuild(rotated(snapshot), choices))).toEqual(expected);
  });
});
