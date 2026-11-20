import { compareText } from '../../planning/rules';
import type { Allocation, Counts, Section } from '../../planning/types';
import { CARD_TYPE_ORDER, type DeckRow } from './deckRows';
import { CARD_TYPE_LABELS, SECTION_LABELS, type AllocationStatus } from './describe';

export type GroupBy = 'cardType' | 'section';
export type SortBy = 'manaValue' | 'name';
export type StatusFilter = 'all' | AllocationStatus;
export type ViewMode = 'list' | 'grid';

export interface ViewChoices {
  readonly groupBy: GroupBy;
  readonly sortBy: SortBy;
  readonly filter: StatusFilter;
}

export const DEFAULT_VIEW_CHOICES: ViewChoices = {
  groupBy: 'cardType',
  sortBy: 'manaValue',
  filter: 'all',
};

export interface ShownRow {
  readonly row: DeckRow;
  readonly allocations: readonly Allocation[];
  readonly copies: number;
}

export interface RowGroup {
  readonly key: string;
  readonly heading: string;
  readonly copies: number;
  readonly isIdeas: boolean;
  readonly rows: readonly ShownRow[];
}

export interface Arrangement {
  readonly groups: readonly RowGroup[];
  readonly shownCopies: number;
  readonly deckCopies: number;
}

interface GroupSpec {
  readonly key: string;
  readonly heading: string;
  readonly isIdeas: boolean;
}

const SECTION_ORDER: readonly Section[] = ['commander', 'main', 'sideboard', 'maybeboard'];

const IDEAS: GroupSpec = { key: 'maybeboard', heading: SECTION_LABELS.maybeboard, isIdeas: true };

const GROUP_SPECS: Record<GroupBy, readonly GroupSpec[]> = {
  cardType: [
    ...CARD_TYPE_ORDER.map((group) => ({
      key: group,
      heading: CARD_TYPE_LABELS[group],
      isIdeas: false,
    })),
    IDEAS,
  ],
  section: SECTION_ORDER.map((section) =>
    section === 'maybeboard'
      ? IDEAS
      : { key: section, heading: SECTION_LABELS[section], isIdeas: false },
  ),
};

function byName(a: ShownRow, b: ShownRow): number {
  return compareText(a.row.name, b.row.name) || compareText(a.row.entryId, b.row.entryId);
}

const COMPARATORS: Record<SortBy, (a: ShownRow, b: ShownRow) => number> = {
  manaValue: (a, b) => a.row.manaValue - b.row.manaValue || byName(a, b),
  name: byName,
};

function total(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

function showRow(row: DeckRow, filter: StatusFilter): ShownRow | null {
  if (filter === 'all') return { row, allocations: row.allocations, copies: row.demand };

  const allocations = row.allocations.filter((allocation) => allocation.status === filter);
  if (allocations.length === 0) return null;

  return { row, allocations, copies: total(allocations.map((allocation) => allocation.quantity)) };
}

function groupKey(row: DeckRow, groupBy: GroupBy): string {
  if (row.section === 'maybeboard') return IDEAS.key;

  return groupBy === 'cardType' ? row.typeGroup : row.section;
}

export function arrangeRows(
  rows: readonly DeckRow[],
  counts: Counts,
  choices: ViewChoices,
): Arrangement {
  const byGroup = new Map<string, ShownRow[]>();
  for (const row of rows) {
    const shown = showRow(row, choices.filter);
    if (shown === null) continue;

    const key = groupKey(row, choices.groupBy);
    const group = byGroup.get(key);
    if (group === undefined) byGroup.set(key, [shown]);
    else group.push(shown);
  }

  const compare = COMPARATORS[choices.sortBy];
  const groups = GROUP_SPECS[choices.groupBy].flatMap((spec): RowGroup[] => {
    const shown = byGroup.get(spec.key);
    if (shown === undefined) return [];

    const copies = total(shown.map((item) => item.copies));
    return [{ ...spec, copies, rows: shown.toSorted(compare) }];
  });

  return {
    groups,
    shownCopies: choices.filter === 'all' ? counts.demand : counts[choices.filter],
    deckCopies: counts.demand,
  };
}
