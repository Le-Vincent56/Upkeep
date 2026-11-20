import type { CatalogIndex } from '../../catalog/catalogIndex';
import type { Color, Finish, Printing } from '../../catalog/types';
import type { Allocation, Block, MoveAllocation, Section } from '../../planning/types';
import type { DeckDetail, DeckFormat } from './contracts';
import type { CardTypeGroup, DeckRow } from './deckRows';

export type AllocationStatus = Allocation['status'];

export const STATUS_LABELS: Record<AllocationStatus, string> = {
  inBox: 'In deck box',
  toMove: 'Available to move',
  toAcquire: 'Need to acquire',
};

export const CARD_TYPE_LABELS: Record<CardTypeGroup, string> = {
  creature: 'Creature',
  planeswalker: 'Planeswalker',
  battle: 'Battle',
  instant: 'Instant',
  sorcery: 'Sorcery',
  artifact: 'Artifact',
  enchantment: 'Enchantment',
  land: 'Land',
  other: 'Other',
};

export const SECTION_LABELS: Record<Section, string> = {
  commander: 'Commander',
  main: 'Main',
  sideboard: 'Sideboard',
  maybeboard: 'Maybeboard',
};

export const FORMAT_LABELS: Record<DeckFormat, string> = {
  commander: 'Commander',
  custom: 'Custom',
};

export const COLOR_WORDS: Record<Color, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

const FINISH_WORDS: Record<Finish, string> = {
  nonfoil: 'Nonfoil',
  foil: 'Foil',
  etched: 'Etched',
};

const SUMMARY_WORDS: Record<AllocationStatus, string> = {
  inBox: 'in deck box',
  toMove: 'to move',
  toAcquire: 'to acquire',
};

const STATUS_ORDER: readonly AllocationStatus[] = ['inBox', 'toMove', 'toAcquire'];

export interface DisplayNames {
  deckName(id: string): string;
  locationName(id: string): string;
}

export function displayNames(detail: DeckDetail): DisplayNames {
  const decks = new Map(detail.decks.map((deck) => [deck.id, deck.name] as const));
  const locations = new Map(
    detail.locations.map((location) => [location.id, location.name] as const),
  );

  return {
    deckName: (id) => decks.get(id) ?? id,
    locationName: (id) => locations.get(id) ?? id,
  };
}

export function printingLabel(printing: Printing, finish: Finish | null): string {
  const label = `${printing.setCode.toUpperCase()} ${printing.collectorNumber}`;
  return finish === null ? label : `${label} · ${FINISH_WORDS[finish]}`;
}

function copiesWith(row: DeckRow, status: AllocationStatus): number {
  return row.allocations
    .filter((allocation) => allocation.status === status)
    .reduce((sum, allocation) => sum + allocation.quantity, 0);
}

export function rowSuffix(row: DeckRow): string {
  const quantity = `×${row.quantity}`;
  return row.exactLabel === null ? quantity : `${quantity} · ${row.exactLabel}`;
}

export function rowTitle(row: DeckRow): string {
  return `${row.name} ${rowSuffix(row)}`;
}

export function statusSummary(row: DeckRow): string {
  if (row.section === 'maybeboard') return 'Idea · not counted';

  return STATUS_ORDER.flatMap((status) => {
    const copies = copiesWith(row, status);
    return copies === 0 ? [] : [`${copies} ${SUMMARY_WORDS[status]}`];
  }).join(' · ');
}

export interface RowNeed {
  readonly status: 'toMove' | 'toAcquire';
  readonly text: string;
}

const NEED_ORDER: readonly RowNeed['status'][] = ['toMove', 'toAcquire'];

export function rowNeeds(row: DeckRow): RowNeed[] {
  if (row.section === 'maybeboard') return [];

  return NEED_ORDER.flatMap((status) => {
    const copies = copiesWith(row, status);
    return copies === 0 ? [] : [{ status, text: `${copies} ${SUMMARY_WORDS[status]}` }];
  });
}

export type RowTone = 'owned' | 'unowned' | 'idea';

export function rowTone(row: DeckRow): RowTone {
  if (row.section === 'maybeboard') return 'idea';

  const nothingOwned =
    row.allocations.length > 0 &&
    row.allocations.every((allocation) => allocation.status === 'toAcquire');
  return nothingOwned ? 'unowned' : 'owned';
}

export function blockPhrase(block: Block, names: DisplayNames): string {
  switch (block.kind) {
    case 'protected':
      return `${names.deckName(block.deckId)} is kept together`;

    case 'target':
      return `kept in ${names.deckName(block.deckId)}'s box`;

    case 'otherTarget':
      return `going to ${names.deckName(block.deckId)}`;

    case 'sameDeck':
      return 'used by another entry in this deck';
  }
}

function printingQualifier(printingId: string, row: DeckRow, catalog: CatalogIndex): string {
  if (row.displayPrinting === null || printingId === row.displayPrinting.id) return '';

  const printing = catalog.printingById(printingId);
  return printing === undefined ? '' : ` · ${printingLabel(printing, null)}`;
}

function moveNote(allocation: MoveAllocation, names: DisplayNames): string {
  switch (allocation.reason) {
    case 'loose':
      return '';

    case 'surplus':
      return ' (spare copy)';

    case 'borrowed':
      return allocation.leavesShortDeckId === null
        ? ''
        : ` · leaves ${names.deckName(allocation.leavesShortDeckId)} short`;
  }
}

export function allocationLine(
  allocation: Allocation,
  row: DeckRow,
  names: DisplayNames,
  catalog: CatalogIndex,
): string {
  switch (allocation.status) {
    case 'inBox': {
      const { locationId, printingId } = allocation.source;
      return `${allocation.quantity} in ${names.locationName(locationId)}${printingQualifier(printingId, row, catalog)}`;
    }

    case 'toMove': {
      const { locationId, printingId } = allocation.source;
      return `${allocation.quantity} to move from ${names.locationName(locationId)}${printingQualifier(printingId, row, catalog)}${moveNote(allocation, names)}`;
    }

    case 'toAcquire': {
      const reason =
        allocation.blockedBy.length === 0
          ? 'not enough owned'
          : allocation.blockedBy.map((block) => blockPhrase(block, names)).join('; ');
      return `${allocation.quantity} to acquire · ${reason}`;
    }
  }
}

export function filteredLine(
  allocation: Allocation,
  row: DeckRow,
  names: DisplayNames,
  catalog: CatalogIndex,
): string {
  return `${allocationLine(allocation, row, names, catalog)} · ${row.demand} wanted`;
}

export function keepTogetherLabel(protectedNames: readonly string[], offeredCount: number): string {
  if (offeredCount === 0) return 'Keep together · No other assembled decks';

  return `Keep together · ${protectedNames.length === 0 ? 'None' : protectedNames.join(', ')}`;
}

export function deckFacts(detail: DeckDetail, copies: number): string {
  return `${FORMAT_LABELS[detail.format]} · ${deckCountLabel(copies)}`;
}

export interface ColorSymbols {
  readonly codes: readonly string[];
  readonly label: string;
}

export function colorSymbols(colors: readonly Color[]): ColorSymbols {
  if (colors.length === 0) return { codes: ['C'], label: 'Colorless' };

  return { codes: colors, label: colors.map((color) => COLOR_WORDS[color]).join(', ') };
}

export function manaCostLabel(codes: readonly string[]): string {
  return `Mana cost: ${codes.join(' ')}`;
}

export interface HeaderArt {
  readonly artCropUrl: string;
  readonly artist: string;
  readonly accent: string | null;
}

export function headerArt(detail: DeckDetail, catalog: CatalogIndex): HeaderArt | null {
  if (detail.headerArtPrintingId === null) return null;

  const image = catalog.printingById(detail.headerArtPrintingId)?.images[0];
  return image === undefined
    ? null
    : { artCropUrl: image.artCrop, artist: image.artist, accent: image.accent ?? null };
}

export function deckCountLabel(copies: number): string {
  return `${copies} ${copies === 1 ? 'card' : 'cards'}`;
}

export function showingLabel(shown: number, total: number): string {
  return `Showing ${shown} of ${deckCountLabel(total)}`;
}
