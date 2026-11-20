import { setNumberKey } from './normalizeName';
import type { Card, CardLayout, Catalog, Color, Finish, Printing } from './types';

const LAYOUTS: readonly CardLayout[] = ['normal', 'transform'];
const COLORS: readonly Color[] = ['W', 'U', 'B', 'R', 'G'];
const FINISHES: readonly Finish[] = ['nonfoil', 'foil', 'etched'];
const HEX_COLOR = /^#[0-9a-f]{6}$/;

type Fields = Record<string, unknown>;

export class CatalogError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(['Invalid catalog:', ...problems.map((problem) => `- ${problem}`)].join('\n'));
    this.name = 'CatalogError';
    this.problems = problems;
  }
}

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fieldChecker(fields: Fields, label: string, problems: string[]) {
  const fail = (key: string, expected: string) =>
    problems.push(`${label}: ${key} must be ${expected}`);

  return {
    string(key: string): void {
      if (typeof fields[key] !== 'string') fail(key, 'a string');
    },
    optionalString(key: string): void {
      if (fields[key] !== undefined && typeof fields[key] !== 'string') fail(key, 'a string');
    },
    optionalHexColor(key: string): void {
      const value = fields[key];
      if (value === undefined) return;
      if (typeof value !== 'string' || !HEX_COLOR.test(value)) fail(key, 'a #rrggbb color');
    },
    number(key: string): void {
      const value = fields[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(key, 'a number');
    },
    oneOf(key: string, allowed: readonly string[]): void {
      const value = fields[key];
      if (typeof value !== 'string' || !allowed.includes(value)) {
        fail(key, `one of ${allowed.join(', ')}`);
      }
    },
    listOf(key: string, allowed: readonly string[], nonEmpty = false): void {
      const value = fields[key];
      const valid =
        Array.isArray(value) &&
        (!nonEmpty || value.length > 0) &&
        value.every((item) => typeof item === 'string' && allowed.includes(item));
      if (!valid) fail(key, `a ${nonEmpty ? 'non-empty ' : ''}list of ${allowed.join(', ')}`);
    },
    records(key: string): unknown[] {
      const value = fields[key];
      if (Array.isArray(value) && value.length > 0) return value;
      fail(key, 'a non-empty list');
      return [];
    },
  };
}

function checkFace(raw: unknown, label: string, problems: string[]): void {
  if (!isFields(raw)) {
    problems.push(`${label}: must be an object`);
    return;
  }

  const check = fieldChecker(raw, label, problems);
  check.string('name');
  check.string('manaCost');
  check.string('typeLine');
  check.string('oracleText');
  check.listOf('colors', COLORS);
  check.optionalString('power');
  check.optionalString('toughness');
}

function checkCard(raw: unknown, index: number, problems: string[]): Card | undefined {
  if (!isFields(raw)) {
    problems.push(`cards[${index}]: must be an object`);
    return undefined;
  }

  const label = typeof raw.oracleId === 'string' ? `card ${raw.oracleId}` : `cards[${index}]`;
  const before = problems.length;
  const check = fieldChecker(raw, label, problems);
  check.string('oracleId');
  check.string('name');
  check.oneOf('layout', LAYOUTS);
  check.number('manaValue');
  check.listOf('colorIdentity', COLORS);
  check.records('faces').forEach((face, i) => checkFace(face, `${label} faces[${i}]`, problems));

  return problems.length === before ? (raw as unknown as Card) : undefined;
}

function checkImage(raw: unknown, label: string, problems: string[]): void {
  if (!isFields(raw)) {
    problems.push(`${label}: must be an object`);
    return;
  }

  const check = fieldChecker(raw, label, problems);
  check.string('normal');
  check.string('artCrop');
  check.string('artist');

  // Strict because the accent is written into a style attribute
  check.optionalHexColor('accent');
}

function checkPrinting(raw: unknown, index: number, problems: string[]) {
  if (!isFields(raw)) {
    problems.push(`printings[${index}]: must be an object`);
    return undefined;
  }

  const label = typeof raw.id === 'string' ? `printing ${raw.id}` : `printings[${index}]`;
  const before = problems.length;
  const check = fieldChecker(raw, label, problems);
  for (const key of [
    'id',
    'oracleId',
    'setCode',
    'setName',
    'collectorNumber',
    'lang',
    'releasedOn',
    'scryfallUrl',
  ]) {
    check.string(key);
  }
  check.listOf('finishes', FINISHES, true);
  check
    .records('images')
    .forEach((image, i) => checkImage(image, `${label} images[${i}]`, problems));

  return problems.length === before ? (raw as unknown as Printing) : undefined;
}

function checkSource(raw: unknown, problems: string[]): void {
  if (!isFields(raw)) {
    problems.push('catalog: source must be an object');
    return;
  }

  const check = fieldChecker(raw, 'catalog source', problems);
  check.string('name');
  check.string('url');
  check.string('retrievedOn');
}

function listOf(raw: Fields, key: string, problems: string[]): unknown[] {
  const value = raw[key];
  if (Array.isArray(value)) return value;
  problems.push(`catalog: ${key} must be a list`);
  return [];
}

function checkReferences(
  cards: readonly Card[],
  printings: readonly Printing[],
  problems: string[],
): void {
  const cardsById = new Map<string, Card>();
  for (const card of cards) {
    if (cardsById.has(card.oracleId)) problems.push(`card ${card.oracleId}: duplicate oracleId`);
    else cardsById.set(card.oracleId, card);
  }

  const printingIds = new Set<string>();
  const setNumbers = new Set<string>();
  const printedCards = new Set<string>();
  for (const printing of printings) {
    const label = `printing ${printing.id}`;
    if (printingIds.has(printing.id)) problems.push(`${label}: duplicate id`);
    printingIds.add(printing.id);

    const setNumber = setNumberKey(printing.setCode, printing.collectorNumber);
    if (setNumbers.has(setNumber)) {
      problems.push(`${label}: duplicate setCode and collectorNumber ${setNumber}`);
    }
    setNumbers.add(setNumber);

    const card = cardsById.get(printing.oracleId);
    if (card === undefined) {
      problems.push(`${label}: oracleId ${printing.oracleId} names no card`);
      continue;
    }
    printedCards.add(card.oracleId);

    // Holds for the normal and transform layouts only; split or adventure cards share one image.
    if (printing.images.length !== card.faces.length) {
      problems.push(
        `${label}: images has ${printing.images.length} entries but the card has ${card.faces.length} faces`,
      );
    }
  }

  for (const oracleId of cardsById.keys()) {
    if (!printedCards.has(oracleId)) problems.push(`card ${oracleId}: has no printing`);
  }
}

export function loadCatalog(raw: unknown): Catalog {
  if (!isFields(raw)) throw new CatalogError(['catalog: must be an object']);

  const problems: string[] = [];
  if (raw.schemaVersion !== 1) problems.push('catalog: schemaVersion must be 1');
  checkSource(raw.source, problems);
  const cards = listOf(raw, 'cards', problems).flatMap(
    (card, i) => checkCard(card, i, problems) ?? [],
  );
  const printings = listOf(raw, 'printings', problems).flatMap(
    (printing, i) => checkPrinting(printing, i, problems) ?? [],
  );

  if (problems.length === 0) checkReferences(cards, printings, problems);
  if (problems.length > 0) throw new CatalogError(problems);

  return raw as unknown as Catalog;
}
