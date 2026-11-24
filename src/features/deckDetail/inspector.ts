import type { CatalogIndex } from '../../catalog/catalogIndex';
import type { Finish } from '../../catalog/types';
import { MAX_QUANTITY, type DeckEdit } from '../../decks/edits';
import type { DeckEntry, ExactPrinting, Section } from '../../decks/types';
import type { DeckRow } from './deckRows';
import { FINISH_WORDS, printingLabel } from '../../catalog/printingLabel';

export interface Choice {
  readonly value: string;
  readonly label: string;
}

export const ANY = '';

export function printingChoices(oracleId: string, catalog: CatalogIndex): Choice[] {
  return [
    { value: ANY, label: 'Any printing' },
    ...catalog.printingsOf(oracleId).map((printing) => ({
      value: printing.id,
      label: printingLabel(printing, null),
    })),
  ];
}

export function finishChoices(printingId: string, catalog: CatalogIndex): Choice[] {
  const finishes = catalog.printingById(printingId)?.finishes ?? [];
  return [
    { value: ANY, label: 'Any finish' },
    ...finishes.map((finish) => ({ value: finish, label: FINISH_WORDS[finish] })),
  ];
}

export function printingEdit(entryId: string, printingId: string): DeckEdit {
  return {
    kind: 'setPrinting',
    entryId,
    printing: printingId === ANY ? null : { printingId, finish: null },
  };
}

function isFinish(value: string): value is Finish {
  return Object.hasOwn(FINISH_WORDS, value);
}

export function finishEdit(entryId: string, printingId: string, finish: string): DeckEdit {
  return {
    kind: 'setPrinting',
    entryId,
    printing: { printingId, finish: isFinish(finish) ? finish : null },
  };
}

export interface AskedValues {
  readonly quantity: number;
  readonly section: Section;
  readonly printing: ExactPrinting | null;
}

export function askedValues(row: DeckRow, pendingEdits: readonly DeckEdit[]): AskedValues {
  let asked: AskedValues = {
    quantity: row.quantity,
    section: row.section,
    printing: row.exactPrinting,
  };

  for (const edit of pendingEdits) {
    if (edit.kind === 'addEntry' || edit.kind === 'addCard' || edit.entryId !== row.entryId)
      continue;

    switch (edit.kind) {
      case 'setQuantity':
        asked = { ...asked, quantity: edit.quantity };
        break;

      case 'setSection':
        asked = { ...asked, section: edit.section };
        break;

      case 'setPrinting':
        asked = { ...asked, printing: edit.printing };
        break;

      case 'removeEntry':
        break;
    }
  }

  return asked;
}

export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const quantity = Number(trimmed);
  return quantity >= 1 && quantity <= MAX_QUANTITY ? quantity : null;
}

export function entryOfRow(row: DeckRow): DeckEntry {
  return {
    id: row.entryId,
    oracleId: row.oracleId,
    section: row.section,
    quantity: row.quantity,
    printing: row.exactPrinting,
  };
}

export function togglePin(pinned: string | null, entryId: string): string | null {
  return pinned === entryId ? null : entryId;
}
