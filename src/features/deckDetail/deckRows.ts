import type { CatalogIndex } from '../../catalog/catalogIndex';
import type { Printing } from '../../catalog/types';
import type { ExactPrinting, Section } from '../../decks/types';
import type {
  Allocation,
  BuildSnapshot,
  PlannedDeck,
  PlannedEntry,
  SnapshotEntry,
} from '../../planning/types';
import { printingLabel } from '../../catalog/printingLabel';

export type CardTypeGroup =
  | 'creature'
  | 'planeswalker'
  | 'battle'
  | 'instant'
  | 'sorcery'
  | 'artifact'
  | 'enchantment'
  | 'land'
  | 'other';

export const CARD_TYPE_ORDER: readonly CardTypeGroup[] = [
  'creature',
  'planeswalker',
  'battle',
  'instant',
  'sorcery',
  'artifact',
  'enchantment',
  'land',
  'other',
];

const MATCH_ORDER: readonly (readonly [CardTypeGroup, string])[] = [
  ['creature', 'Creature'],
  ['planeswalker', 'Planeswalker'],
  ['battle', 'Battle'],
  ['land', 'Land'],
  ['instant', 'Instant'],
  ['sorcery', 'Sorcery'],
  ['artifact', 'Artifact'],
  ['enchantment', 'Enchantment'],
];

export function cardTypeGroup(typeLine: string): CardTypeGroup {
  const types = new Set(typeLine.split('—')[0]?.trim().split(/\s+/));
  return MATCH_ORDER.find(([, type]) => types.has(type))?.[0] ?? 'other';
}

export interface DeckRow {
  readonly entryId: string;
  readonly oracleId: string;
  readonly name: string;
  readonly section: Section;
  readonly quantity: number;
  readonly demand: number;
  readonly manaValue: number;
  readonly manaCost: string;
  readonly typeLine: string;
  readonly typeGroup: CardTypeGroup;
  readonly exactPrinting: ExactPrinting | null;
  readonly exactLabel: string | null;
  readonly displayPrinting: Printing | null;
  readonly allocations: readonly Allocation[];
}

function sourcedPrinting(
  allocations: readonly Allocation[],
  catalog: CatalogIndex,
): Printing | undefined {
  for (const allocation of allocations) {
    if (allocation.status !== 'toAcquire')
      return catalog.printingById(allocation.source.printingId);
  }

  return undefined;
}

function requiredPrinting(entry: SnapshotEntry, catalog: CatalogIndex): Printing | null {
  if (entry.printing === null) return null;

  const printing = catalog.printingById(entry.printing.printingId);
  if (printing === undefined) {
    throw new Error(`Printing ${entry.printing.printingId} is missing from the catalog`);
  }

  return printing;
}

function toRow(planned: PlannedEntry, entry: SnapshotEntry, catalog: CatalogIndex): DeckRow {
  const card = catalog.cardByOracleId(planned.oracleId);
  if (card === undefined) throw new Error(`Card ${planned.oracleId} is missing from the catalog`);

  const exact = requiredPrinting(entry, catalog);
  const front = card.faces[0];
  const typeLine = front?.typeLine ?? '';
  return {
    entryId: planned.entryId,
    oracleId: planned.oracleId,
    name: card.name,
    section: entry.section,
    quantity: entry.quantity,
    demand: planned.demand,
    manaValue: card.manaValue,
    manaCost: front?.manaCost ?? '',
    typeLine,
    typeGroup: cardTypeGroup(typeLine),
    exactPrinting: entry.printing,
    exactLabel: exact === null ? null : printingLabel(exact, entry.printing?.finish ?? null),
    displayPrinting:
      exact ??
      sourcedPrinting(planned.allocations, catalog) ??
      catalog.printingsOf(planned.oracleId)[0] ??
      null,
    allocations: planned.allocations,
  };
}

export function buildDeckRows(
  plannedDeck: PlannedDeck,
  snapshot: BuildSnapshot,
  catalog: CatalogIndex,
): DeckRow[] {
  const deck = snapshot.decks.find((candidate) => candidate.id === plannedDeck.deckId);
  const entries = new Map(deck?.entries.map((entry) => [entry.id, entry] as const));

  return plannedDeck.entries.map((planned) => {
    const entry = entries.get(planned.entryId);
    if (entry === undefined) {
      throw new Error(`Planned entry ${planned.entryId} is missing from the snapshot`);
    }

    return toRow(planned, entry, catalog);
  });
}
