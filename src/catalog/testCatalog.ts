export type RawRecord = Record<string, unknown>;

export const TEST_ORACLE_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_PRINTING_ID = '00000000-0000-4000-8000-000000000101';

export function rawCard(overrides: RawRecord = {}): RawRecord {
  return {
    oracleId: TEST_ORACLE_ID,
    name: 'Test Relic',
    layout: 'normal',
    manaValue: 1,
    colorIdentity: [],
    faces: [
      {
        name: 'Test Relic',
        manaCost: '{1}',
        typeLine: 'Artifact',
        oracleText: '{T}: Add {C}.',
        colors: [],
      },
    ],
    ...overrides,
  };
}

export function rawPrinting(overrides: RawRecord = {}): RawRecord {
  return {
    id: TEST_PRINTING_ID,
    oracleId: TEST_ORACLE_ID,
    setCode: 'tst',
    setName: 'Test Set',
    collectorNumber: '1',
    lang: 'en',
    releasedOn: '2026-01-01',
    finishes: ['nonfoil'],
    scryfallUrl: 'https://scryfall.com/card/tst/1/test-relic',
    images: [
      {
        normal: 'https://cards.scryfall.io/normal/front/0/0/test.jpg',
        artCrop: 'https://cards.scryfall.io/art_crop/front/0/0/test.jpg',
        artist: 'Test Artist',
      },
    ],
    ...overrides,
  };
}

export function rawCatalog(
  cards: unknown[] = [rawCard()],
  printings: unknown[] = [rawPrinting()],
): RawRecord {
  return {
    schemaVersion: 1,
    source: { name: 'Scryfall', url: 'https://api.scryfall.com', retrievedOn: '2026-11-18' },
    cards,
    printings,
  };
}
