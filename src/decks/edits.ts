import type { CatalogIndex } from '../catalog/catalogIndex';
import type { DeckEntry, ExactPrinting, Section } from './types';

export type DeckEdit =
  | { readonly kind: 'setQuantity'; readonly entryId: string; readonly quantity: number }
  | { readonly kind: 'setSection'; readonly entryId: string; readonly section: Section }
  | {
      readonly kind: 'setPrinting';
      readonly entryId: string;
      readonly printing: ExactPrinting | null;
    }
  | { readonly kind: 'removeEntry'; readonly entryId: string }
  | { readonly kind: 'addEntry'; readonly entry: DeckEntry; readonly at?: number };

export type DeckEditCode =
  | 'unknownEntry'
  | 'duplicateEntry'
  | 'badQuantity'
  | 'unknownCard'
  | 'wrongPrinting'
  | 'noSuchFinish';

export class DeckEditError extends Error {
  readonly code: DeckEditCode;

  constructor(code: DeckEditCode, message: string) {
    super(message);
    this.name = 'DeckEditError';
    this.code = code;
  }
}

export const MAX_QUANTITY = 999;

export function editedEntryId(edit: DeckEdit): string {
  return edit.kind === 'addEntry' ? edit.entry.id : edit.entryId;
}

function checkQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new DeckEditError(
      'badQuantity',
      `A quantity must be a whole number from 1 to ${MAX_QUANTITY}`,
    );
  }
}

function checkPrinting(
  oracleId: string,
  printing: ExactPrinting | null,
  catalog: CatalogIndex,
): void {
  if (printing === null) return;

  const found = catalog.printingById(printing.printingId);
  if (found === undefined || found.oracleId !== oracleId) {
    const cardName = catalog.cardByOracleId(oracleId)?.name ?? oracleId;
    throw new DeckEditError(
      'wrongPrinting',
      `Printing ${printing.printingId} isn't a printing of ${cardName}`,
    );
  }

  if (printing.finish !== null && !found.finishes.includes(printing.finish)) {
    const label = `${found.setCode.toUpperCase()} ${found.collectorNumber}`;
    throw new DeckEditError('noSuchFinish', `${label} has no ${printing.finish} finish`);
  }
}

function checkEntry(entry: DeckEntry, catalog: CatalogIndex): void {
  if (catalog.cardByOracleId(entry.oracleId) === undefined) {
    throw new DeckEditError('unknownCard', `No card with id ${entry.oracleId}`);
  }

  checkQuantity(entry.quantity);
  checkPrinting(entry.oracleId, entry.printing, catalog);
}

function findEntry(entries: readonly DeckEntry[], entryId: string): [number, DeckEntry] {
  const index = entries.findIndex((entry) => entry.id === entryId);
  const entry = entries[index];
  if (entry === undefined) {
    throw new DeckEditError('unknownEntry', `This deck has no entry ${entryId}`);
  }

  return [index, entry];
}

function replaceAt(entries: readonly DeckEntry[], index: number, entry: DeckEntry): DeckEntry[] {
  return entries.map((current, at) => (at === index ? entry : current));
}

/** Checks one edit against the catalog and returns the deck's new entries; never changes its input. */
export function applyDeckEdit(
  entries: readonly DeckEntry[],
  edit: DeckEdit,
  catalog: CatalogIndex,
): DeckEntry[] {
  if (edit.kind === 'addEntry') {
    if (entries.some((entry) => entry.id === edit.entry.id)) {
      throw new DeckEditError('duplicateEntry', `This deck already has entry ${edit.entry.id}`);
    }
    checkEntry(edit.entry, catalog);

    // Put back passes the old position, so the planner sees the same entry order as before.
    const at = Math.min(Math.max(edit.at ?? entries.length, 0), entries.length);
    return [...entries.slice(0, at), edit.entry, ...entries.slice(at)];
  }

  const [index, entry] = findEntry(entries, edit.entryId);

  switch (edit.kind) {
    case 'setQuantity':
      checkQuantity(edit.quantity);
      return replaceAt(entries, index, { ...entry, quantity: edit.quantity });

    case 'setSection':
      return replaceAt(entries, index, { ...entry, section: edit.section });

    case 'setPrinting':
      checkPrinting(entry.oracleId, edit.printing, catalog);
      return replaceAt(entries, index, { ...entry, printing: edit.printing });

    case 'removeEntry':
      return entries.filter((_, at) => at !== index);
  }
}
