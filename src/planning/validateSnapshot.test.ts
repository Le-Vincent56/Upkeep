import { describe, expect, it } from 'vitest';
import { IDS, PRINTINGS, walkthroughSnapshot } from './fixtures/zukoHydras';
import type { BuildSnapshot, SnapshotDeck } from './types';
import { PlanningError, validateSnapshot } from './validateSnapshot';

function problemsOf(snapshot: BuildSnapshot): readonly string[] {
  try {
    validateSnapshot(snapshot);
  } catch (error) {
    expect(error).toBeInstanceOf(PlanningError);
    return (error as PlanningError).problems;
  }
  throw new Error('expected validateSnapshot to throw');
}

function expectProblem(snapshot: BuildSnapshot, ...fragments: string[]): void {
  const problems = problemsOf(snapshot);
  expect(
    problems.some((problem) => fragments.every((fragment) => problem.includes(fragment))),
    `no problem contains ${JSON.stringify(fragments)} in ${JSON.stringify(problems)}`,
  ).toBe(true);
}

function withDeck(id: string, change: (deck: SnapshotDeck) => SnapshotDeck): BuildSnapshot {
  const base = walkthroughSnapshot();
  return { ...base, decks: base.decks.map((d) => (d.id === id ? change(d) : d)) };
}

describe('validateSnapshot', () => {
  it('accepts the walkthrough snapshot', () => {
    expect(() => validateSnapshot(walkthroughSnapshot())).not.toThrow();
  });

  it('rejects a deck that is both target and protected', () => {
    expectProblem(
      walkthroughSnapshot({ protectedIds: [IDS.zuko] }),
      IDS.zuko,
      'target',
      'protected',
    );
  });

  it('rejects a protected deck with no box', () => {
    expectProblem(
      walkthroughSnapshot({ protectedIds: [IDS.draft] }),
      IDS.draft,
      'protected',
      'box',
    );
  });

  it('rejects an unknown selected deck', () => {
    expectProblem(walkthroughSnapshot({ targets: ['deck-missing'] }), 'deck-missing');
    expectProblem(walkthroughSnapshot({ protectedIds: ['deck-missing'] }), 'deck-missing');
  });

  it('rejects a deck selected twice as target', () => {
    expectProblem(walkthroughSnapshot({ targets: [IDS.zuko, IDS.zuko] }), IDS.zuko, 'duplicate');
  });

  it('rejects duplicate deck, entry, and location ids', () => {
    const base = walkthroughSnapshot();
    const [zuko] = base.decks;
    if (zuko === undefined) throw new Error('fixture has no decks');

    expectProblem({ ...base, decks: [...base.decks, zuko] }, IDS.zuko, 'duplicate');
    expectProblem(
      withDeck(IDS.draft, (d) => ({ ...d, entries: [...d.entries, ...zuko.entries] })),
      IDS.zukoSolRing,
      'duplicate',
    );
    expectProblem(
      { ...base, locations: [...base.locations, { id: IDS.binder }] },
      IDS.binder,
      'duplicate',
    );
  });

  it('rejects an unknown box location', () => {
    expectProblem(
      withDeck(IDS.zuko, (d) => ({ ...d, boxLocationId: 'loc-nowhere' })),
      IDS.zuko,
      'location',
    );
  });

  it('rejects stock at an unknown location', () => {
    const base = walkthroughSnapshot();
    expectProblem(
      { ...base, stock: base.stock.map((row) => ({ ...row, locationId: 'loc-nowhere' })) },
      'loc-nowhere',
      'location',
    );
  });

  it('rejects one location boxing two decks', () => {
    expectProblem(
      withDeck(IDS.draft, (d) => ({ ...d, boxLocationId: IDS.zukoBox })),
      IDS.zukoBox,
      'box',
    );
  });

  it('rejects duplicate stock rows', () => {
    const base = walkthroughSnapshot();
    const [first] = base.stock;
    if (first === undefined) throw new Error('fixture has no stock');
    expectProblem(
      { ...base, stock: [...base.stock, first] },
      'stock',
      PRINTINGS.mountain,
      'duplicate',
    );
  });

  it('rejects a quantity that is not a positive integer', () => {
    for (const quantity of [0, -1, 1.5]) {
      expectProblem(
        withDeck(IDS.zuko, (d) => ({
          ...d,
          entries: d.entries.map((e) => (e.id === IDS.zukoMountain ? { ...e, quantity } : e)),
        })),
        IDS.zukoMountain,
        'quantity',
      );

      const base = walkthroughSnapshot();
      expectProblem(
        { ...base, stock: base.stock.map((row) => ({ ...row, quantity })) },
        'stock',
        'quantity',
      );
    }
  });

  it('reports every problem, not only the first', () => {
    const base = walkthroughSnapshot({ protectedIds: [IDS.zuko] });
    const broken = { ...base, stock: base.stock.map((row) => ({ ...row, quantity: 0 })) };
    const problems = problemsOf(broken);

    expect(problems.some((p) => p.includes(IDS.zuko) && p.includes('protected'))).toBe(true);
    expect(problems.some((p) => p.includes('stock') && p.includes('quantity'))).toBe(true);

    let message = '';
    try {
      validateSnapshot(broken);
    } catch (error) {
      message = (error as Error).message;
    }
    for (const problem of problems) expect(message).toContain(problem);
  });
});
