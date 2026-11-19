import { CatalogError } from './loadCatalog';
import { normalizeName, setNumberKey } from './normalizeName';
import type { Card, Catalog, Printing } from './types';

/** Exact lookups over one loaded catalog. Unknown keys return undefined or an empty list.  */
export interface CatalogIndex {
  printingById(id: string): Printing | undefined;
  printingBySetAndNumber(setCode: string, collectorNumber: string): Printing | undefined;
  cardByName(name: string): Card | undefined;
  cardByOracleId(oracleId: string): Card | undefined;
  printingsOf(oracleId: string): readonly Printing[];
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function newestFirst(a: Printing, b: Printing): number {
  return (
    compareText(b.releasedOn, a.releasedOn) ||
    compareText(a.setCode, b.setCode) ||
    compareText(a.collectorNumber, b.collectorNumber)
  );
}

function indexNames(cards: readonly Card[]): Map<string, Card> {
  const byName = new Map<string, Card>();
  const problems: string[] = [];
  for (const card of cards) {
    const keys = new Set([card.name, ...card.faces.map((face) => face.name)].map(normalizeName));
    for (const key of keys) {
      if (key === '') continue;
      const existing = byName.get(key);
      if (existing === undefined) byName.set(key, card);
      else if (existing.oracleId !== card.oracleId) {
        problems.push(
          `name "${key}" belongs to card ${existing.oracleId} and card ${card.oracleId}`,
        );
      }
    }
  }

  if (problems.length > 0) throw new CatalogError(problems);

  return byName;
}

function groupPrintings(printings: readonly Printing[]): Map<string, Printing[]> {
  const byCard = new Map<string, Printing[]>();
  for (const printing of printings) {
    const group = byCard.get(printing.oracleId);
    if (group === undefined) byCard.set(printing.oracleId, [printing]);
    else group.push(printing);
  }

  for (const group of byCard.values()) group.sort(newestFirst);

  return byCard;
}

export function buildCatalogIndex(catalog: Catalog): CatalogIndex {
  const cardsById = new Map(catalog.cards.map((card) => [card.oracleId, card] as const));
  const cardsByName = indexNames(catalog.cards);
  const printingsById = new Map(catalog.printings.map((p) => [p.id, p] as const));
  const printingsBySetNumber = new Map(
    catalog.printings.map((p) => [setNumberKey(p.setCode, p.collectorNumber), p] as const),
  );
  const printingsByCard = groupPrintings(catalog.printings);

  return {
    printingById: (id) => printingsById.get(id),
    printingBySetAndNumber: (setCode, collectorNumber) =>
      printingsBySetNumber.get(setNumberKey(setCode, collectorNumber)),
    cardByName: (name) => cardsByName.get(normalizeName(name)),
    cardByOracleId: (oracleId) => cardsById.get(oracleId),
    printingsOf: (oracleId) => printingsByCard.get(oracleId) ?? [],
  };
}
