import type { CatalogIndex } from '../../catalog/catalogIndex';
import { printingLabel } from '../../catalog/printingLabel';
import { MAX_QUANTITY } from '../../decks/edits';
import type { DeckEntry, Section } from '../../decks/types';
import { submittedMatch, type CardFieldState } from '../../ui/cardFieldState';
import type { AddOutcome } from './deckBuildRequests';
import { SECTION_LABELS } from './describe';
import { parseQuantity } from './inspector';

export type AddAttempt =
  | { readonly kind: 'none' }
  | { readonly kind: 'refused'; readonly line: string }
  | { readonly kind: 'send'; readonly entry: DeckEntry };

export function addAttempt(
  field: CardFieldState,
  section: Section,
  quantityText: string,
  newId: string,
): AddAttempt {
  const text = field.text.trim();
  if (text === '') return { kind: 'none' };

  const match = submittedMatch(field);
  if (match === null) return { kind: 'refused', line: `No card matches ‘${text}’` };

  const quantity = parseQuantity(quantityText);
  if (quantity === null) {
    return {
      kind: 'refused',
      line: `A quantity must be a whole number from 1 to ${MAX_QUANTITY}`,
    };
  }

  return {
    kind: 'send',
    entry: {
      id: newId,
      oracleId: match.card.oracleId,
      section,
      quantity,
      printing: match.printing === null ? null : { printingId: match.printing.id, finish: null },
    },
  };
}

function cardName(oracleId: string, catalog: CatalogIndex): string {
  return catalog.cardByOracleId(oracleId)?.name ?? oracleId;
}

function entryName(entry: DeckEntry, catalog: CatalogIndex): string {
  const name = cardName(entry.oracleId, catalog);
  if (entry.printing === null) return name;

  const printing = catalog.printingById(entry.printing.printingId);
  return printing === undefined
    ? name
    : `${name} · ${printingLabel(printing, entry.printing.finish)}`;
}

export function addResultLine(
  asked: DeckEntry,
  outcome: AddOutcome,
  catalog: CatalogIndex,
): string {
  if (outcome.kind === 'failed') return `Couldn't add this card · ${outcome.message}`;
  if (outcome.kind === 'dropped') {
    return `Couldn't add ${cardName(asked.oracleId, catalog)} · an earlier change failed`;
  }

  const { entry } = outcome;
  const name = entryName(entry, catalog);
  const section = SECTION_LABELS[entry.section];

  return outcome.kind === 'added'
    ? `Added ${name} ×${entry.quantity} to ${section}`
    : `${name} is now ×${entry.quantity} in ${section}`;
}
