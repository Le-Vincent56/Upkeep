import type { CatalogIndex } from './catalogIndex';
import type { Card, Printing } from './types';

export interface SetNumber {
  readonly setCode: string;
  readonly collectorNumber: string;
}

export interface CardMatch {
  readonly card: Card;
  readonly printing: Printing | null;
}

export const CARD_MATCH_LIMIT = 8;

const SET_NUMBER = /^([a-z0-9]{2,6})(?:\s*\/\s*|\s+)([^\s/]+)$/i;

export function parseSetNumber(text: string): SetNumber | null {
  const match = SET_NUMBER.exec(text.trim());
  if (match?.[1] === undefined || match[2] === undefined) return null;

  return { setCode: match[1].toLowerCase(), collectorNumber: match[2] };
}

function printingMatch(catalog: CatalogIndex, text: string): CardMatch | null {
  const setNumber = parseSetNumber(text);
  if (setNumber === null) return null;

  const printing = catalog.printingBySetAndNumber(setNumber.setCode, setNumber.collectorNumber);
  const card = printing === undefined ? undefined : catalog.cardByOracleId(printing.oracleId);

  return printing === undefined || card === undefined ? null : { card, printing };
}

/** What the card field offers for its text: a set-and-number printing first, then name matches. */
export function cardMatches(
  catalog: CatalogIndex,
  text: string,
  limit: number,
): readonly CardMatch[] {
  const leading = printingMatch(catalog, text);
  const leadingCount = leading === null ? 0 : 1;
  const named = catalog
    .searchCards(text, Math.max(limit - leadingCount, 0))
    .map((card) => ({ card, printing: null }));

  return (leading === null ? named : [leading, ...named]).slice(0, limit);
}
