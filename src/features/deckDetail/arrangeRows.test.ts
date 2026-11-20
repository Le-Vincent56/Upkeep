import { describe, expect, it } from 'vitest';
import { IDS } from '../../planning/fixtures/zukoHydras';
import {
  arrangeRows,
  DEFAULT_VIEW_CHOICES,
  type Arrangement,
  type GroupBy,
  type StatusFilter,
  type ViewChoices,
} from './arrangeRows';
import { counts, inBox, row, toMove, walkthroughRows } from './testRows';

function choices(overrides: Partial<ViewChoices> = {}): ViewChoices {
  return { ...DEFAULT_VIEW_CHOICES, ...overrides };
}

function arrangeWalkthrough(protectedIds: readonly string[], view: Partial<ViewChoices> = {}) {
  const { plannedDeck, rows } = walkthroughRows(protectedIds);
  return arrangeRows(rows, plannedDeck.counts, choices(view));
}

function headings(arrangement: Arrangement): string[] {
  return arrangement.groups.map((group) => group.heading);
}

function entryIds(arrangement: Arrangement): string[][] {
  return arrangement.groups.map((group) => group.rows.map((shown) => shown.row.entryId));
}

describe('arrangeRows', () => {
  it('defaults to card type, mana value, all cards', () => {
    expect(DEFAULT_VIEW_CHOICES).toEqual({
      groupBy: 'cardType',
      sortBy: 'manaValue',
      filter: 'all',
    });
  });

  it('groups by card type with Maybeboard last', () => {
    const arrangement = arrangeWalkthrough([IDS.hydras]);

    expect(headings(arrangement)).toEqual(['Artifact', 'Land', 'Maybeboard']);
    expect(arrangement.groups.map((group) => group.copies)).toEqual([1, 4, 0]);
    expect(arrangement.groups.map((group) => group.isIdeas)).toEqual([false, false, true]);
    expect(entryIds(arrangement)).toEqual([
      [IDS.zukoSolRing],
      [IDS.zukoMountain],
      [IDS.zukoMaybeSolRing],
    ]);
    expect(arrangement.shownCopies).toBe(5);
    expect(arrangement.deckCopies).toBe(5);
  });

  it('filters to copies available to move', () => {
    const arrangement = arrangeWalkthrough([IDS.hydras], { filter: 'toMove' });

    expect(headings(arrangement)).toEqual(['Land']);
    const mountain = arrangement.groups[0]?.rows[0];
    expect(mountain?.copies).toBe(2);
    expect(mountain?.allocations.map((allocation) => allocation.status)).toEqual(['toMove']);
    expect(arrangement.shownCopies).toBe(2);
    expect(arrangement.deckCopies).toBe(5);
  });

  it('filters to copies to acquire', () => {
    const arrangement = arrangeWalkthrough([IDS.hydras], { filter: 'toAcquire' });

    expect(headings(arrangement)).toEqual(['Artifact']);
    expect(arrangement.shownCopies).toBe(1);
  });

  it('filters to copies in the deck box', () => {
    const arrangement = arrangeWalkthrough([IDS.hydras], { filter: 'inBox' });

    expect(headings(arrangement)).toEqual(['Land']);
    expect(arrangement.groups[0]?.rows[0]?.copies).toBe(2);
    expect(arrangement.shownCopies).toBe(2);
  });

  it('shows the unprotected walkthrough', () => {
    const moving = arrangeWalkthrough([], { filter: 'toMove' });
    const buying = arrangeWalkthrough([], { filter: 'toAcquire' });

    expect(headings(moving)).toEqual(['Artifact', 'Land']);
    expect(moving.shownCopies).toBe(3);
    expect(buying.groups).toEqual([]);
    expect(buying.shownCopies).toBe(0);
  });

  it('groups by section, omitting empty sections', () => {
    expect(headings(arrangeWalkthrough([IDS.hydras], { groupBy: 'section' }))).toEqual([
      'Main',
      'Maybeboard',
    ]);

    const every = [
      row({ entryId: 'e-side', section: 'sideboard' }),
      row({ entryId: 'e-maybe', section: 'maybeboard', demand: 0 }),
      row({ entryId: 'e-main', section: 'main' }),
      row({ entryId: 'e-commander', section: 'commander' }),
    ];
    expect(headings(arrangeRows(every, counts(3), choices({ groupBy: 'section' })))).toEqual([
      'Commander',
      'Main',
      'Sideboard',
      'Maybeboard',
    ]);
  });

  it('puts the same card in two sections on two rows', () => {
    const rows = [
      row({ entryId: 'e-side', name: 'Sol Ring', section: 'sideboard' }),
      row({ entryId: 'e-main', name: 'Sol Ring', section: 'main' }),
    ];

    const byType = arrangeRows(rows, counts(2), choices());
    expect(headings(byType)).toEqual(['Artifact']);
    expect(entryIds(byType)).toEqual([['e-main', 'e-side']]);

    const bySection = arrangeRows(rows, counts(2), choices({ groupBy: 'section' }));
    expect(headings(bySection)).toEqual(['Main', 'Sideboard']);
  });

  it('sorts by mana value, then name, then entry id', () => {
    const rows = [
      row({ entryId: 'e1', name: 'Beta', manaValue: 2 }),
      row({ entryId: 'e2', name: 'Zeta', manaValue: 1 }),
      row({ entryId: 'e3', name: 'Alpha', manaValue: 2 }),
      row({ entryId: 'e0', name: 'Alpha', manaValue: 2 }),
    ];

    expect(entryIds(arrangeRows(rows, counts(4), choices()))).toEqual([['e2', 'e0', 'e3', 'e1']]);
    expect(entryIds(arrangeRows(rows, counts(4), choices({ sortBy: 'name' })))).toEqual([
      ['e0', 'e3', 'e1', 'e2'],
    ]);
  });

  it('shows every line of a row drawing from two sources', () => {
    const mountain = row({
      name: 'Mountain',
      typeGroup: 'land',
      quantity: 4,
      demand: 4,
      allocations: [
        inBox(1, IDS.zukoBox),
        toMove(2, IDS.binder, 'loose'),
        toMove(1, IDS.hydrasBox, 'surplus', { boxDeckId: IDS.hydras }),
      ],
    });

    const shown = arrangeRows([mountain], counts(4, 1, 3), choices({ filter: 'toMove' }));
    expect(shown.groups[0]?.rows[0]?.allocations).toHaveLength(2);
    expect(shown.groups[0]?.rows[0]?.copies).toBe(3);
    expect(shown.groups[0]?.copies).toBe(3);
  });

  it('handles an empty deck', () => {
    const empty = arrangeRows([], counts(0), choices());
    expect(empty).toEqual({ groups: [], shownCopies: 0, deckCopies: 0 });

    const ideaOnly = [row({ entryId: 'e-maybe', section: 'maybeboard', demand: 0 })];
    const all = arrangeRows(ideaOnly, counts(0), choices());
    expect(headings(all)).toEqual(['Maybeboard']);
    expect(all.groups[0]?.isIdeas).toBe(true);
    expect(arrangeRows(ideaOnly, counts(0), choices({ filter: 'toMove' })).groups).toEqual([]);
  });

  it('adds group subtotals up to the shown total, which comes from the plan', () => {
    const filters: StatusFilter[] = ['all', 'inBox', 'toMove', 'toAcquire'];
    const groupings: GroupBy[] = ['cardType', 'section'];

    for (const protectedIds of [[IDS.hydras], []]) {
      const { plannedDeck, rows } = walkthroughRows(protectedIds);
      for (const filter of filters) {
        for (const groupBy of groupings) {
          const arrangement = arrangeRows(rows, plannedDeck.counts, choices({ filter, groupBy }));
          const subtotal = arrangement.groups.reduce((sum, group) => sum + group.copies, 0);
          const planned = filter === 'all' ? plannedDeck.counts.demand : plannedDeck.counts[filter];

          expect(subtotal).toBe(arrangement.shownCopies);
          expect(arrangement.shownCopies).toBe(planned);
          expect(arrangement.deckCopies).toBe(plannedDeck.counts.demand);
        }
      }
    }
  });
});
