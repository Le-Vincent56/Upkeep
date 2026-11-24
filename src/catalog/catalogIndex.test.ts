import { describe, expect, it } from 'vitest';
import { buildCatalogIndex, type CatalogIndex } from './catalogIndex';
import { CatalogError, loadCatalog } from './loadCatalog';
import { seedIndex } from './seedCatalog';
import { rawCard, rawCatalog, rawPrinting, TEST_ORACLE_ID } from './testCatalog';

const SOL_RING = '6ad8011d-3471-4369-9d68-b264cc027487';
const MOUNTAIN = 'a3fb7228-e76b-4e96-a40e-20b5fed75685';
const FIRE_LORD_ZUKO = 'a129423d-c886-4120-96f7-c2517ea7eb83';
const POLUKRANOS = '7a9fa906-b43e-4d98-b134-5936d3085851';

const TLE_SOL_RING = 'c1f93f78-645b-4f21-a80b-5542f3328111';
const CMM_SOL_RING = '46ca0b66-a000-4483-b916-f5b89e710244';
const TLA_MOUNTAIN = 'c44f81ca-f72f-445c-8901-3a894a2a47f9';
const TLA_FIRE_LORD_ZUKO = 'e62d3bcc-7bb4-42be-90a9-caf3c1caa29d';
const MOM_POLUKRANOS = '47f7d313-8333-41fe-8bfa-c96774dac228';

function indexOf(cards: unknown[], printings: unknown[]): CatalogIndex {
  return buildCatalogIndex(loadCatalog(rawCatalog(cards, printings)));
}

function testPrinting(n: number, setCode: string, collectorNumber: string): unknown {
  return rawPrinting({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    setCode,
    collectorNumber,
  });
}

describe('buildCatalogIndex', () => {
  it('finds each seeded printing by id', () => {
    for (const id of [
      TLE_SOL_RING,
      CMM_SOL_RING,
      TLA_MOUNTAIN,
      TLA_FIRE_LORD_ZUKO,
      MOM_POLUKRANOS,
    ]) {
      expect(seedIndex.printingById(id)?.id).toBe(id);
    }
    expect(seedIndex.printingById('not-an-id')).toBeUndefined();
  });

  it('finds a printing by set and collector number', () => {
    expect(seedIndex.printingBySetAndNumber('tle', '316')?.id).toBe(TLE_SOL_RING);
    expect(seedIndex.printingBySetAndNumber('TLE', ' 316 ')?.id).toBe(TLE_SOL_RING);
    expect(seedIndex.printingBySetAndNumber('cmm', '410')?.id).toBe(CMM_SOL_RING);
    expect(seedIndex.printingBySetAndNumber('tle', '999')).toBeUndefined();
  });

  it('keeps collector numbers with a suffix distinct', () => {
    const plain = testPrinting(201, 'x', '410');
    const suffixed = testPrinting(202, 'x', '410z');
    const index = indexOf([rawCard()], [plain, suffixed]);

    expect(index.printingBySetAndNumber('x', '410')?.collectorNumber).toBe('410');
    expect(index.printingBySetAndNumber('x', '410z')?.collectorNumber).toBe('410z');
    expect(index.printingBySetAndNumber('x', '410Z')).toBeUndefined();
  });

  it('finds a card by name in any case', () => {
    expect(seedIndex.cardByName('sol ring')?.oracleId).toBe(SOL_RING);
    expect(seedIndex.cardByName('SOL RING')?.oracleId).toBe(SOL_RING);
    expect(seedIndex.cardByName('Fire Lord Zuko')?.oracleId).toBe(FIRE_LORD_ZUKO);
    expect(seedIndex.cardByName('mountain')?.oracleId).toBe(MOUNTAIN);
  });

  it('finds a double-faced card by either face or its full name', () => {
    for (const name of [
      'polukranos reborn',
      'Polukranos, Engine of Ruin',
      'Polukranos Reborn // Polukranos, Engine of Ruin',
    ]) {
      expect(seedIndex.cardByName(name)?.oracleId).toBe(POLUKRANOS);
    }
  });

  it('returns undefined for unknown or empty names', () => {
    expect(seedIndex.cardByName('Sol Rings')).toBeUndefined();
    expect(seedIndex.cardByName('')).toBeUndefined();
    expect(seedIndex.cardByName('   ')).toBeUndefined();
  });

  it('finds a card by oracle id', () => {
    expect(seedIndex.cardByOracleId(SOL_RING)?.name).toBe('Sol Ring');
    expect(seedIndex.cardByOracleId('nope')).toBeUndefined();
  });

  it('lists Sol Ring printings newest first', () => {
    expect(seedIndex.printingsOf(SOL_RING).map((printing) => printing.id)).toEqual([
      TLE_SOL_RING,
      CMM_SOL_RING,
    ]);
  });

  it('orders same-day printings by set then number', () => {
    const index = indexOf(
      [rawCard()],
      [testPrinting(301, 'b', '2'), testPrinting(302, 'a', '10'), testPrinting(303, 'a', '1')],
    );

    expect(
      index
        .printingsOf(TEST_ORACLE_ID)
        .map((printing) => `${printing.setCode}/${printing.collectorNumber}`),
    ).toEqual(['a/1', 'a/10', 'b/2']);
  });

  it('returns an empty list for an unknown card', () => {
    expect(seedIndex.printingsOf('nope')).toEqual([]);
  });

  it('fails when two cards share a normalized name', () => {
    const otherOracleId = '00000000-0000-4000-8000-000000000002';
    const first = rawCard({ name: 'Sol Ring', faces: [faceNamed('Sol Ring')] });
    const second = rawCard({
      oracleId: otherOracleId,
      name: 'Sol-Ring',
      faces: [faceNamed('Sol-Ring')],
    });
    const printings = [
      testPrinting(401, 'tst', '1'),
      rawPrinting({
        id: '00000000-0000-4000-8000-000000000402',
        oracleId: otherOracleId,
        collectorNumber: '2',
      }),
    ];
    const catalog = loadCatalog(rawCatalog([first, second], printings));

    let caught: unknown;
    try {
      buildCatalogIndex(catalog);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CatalogError);
    const problems = (caught as CatalogError).problems.join('\n');
    expect(problems).toContain('sol ring');
    expect(problems).toContain(TEST_ORACLE_ID);
    expect(problems).toContain(otherOracleId);
  });
});

function faceNamed(name: string): Record<string, unknown> {
  return { name, manaCost: '{1}', typeLine: 'Artifact', oracleText: '', colors: [] };
}

function namesFor(query: string, limit = 8, index: CatalogIndex = seedIndex): string[] {
  return index.searchCards(query, limit).map((card) => card.name);
}

function namedCard(n: number, name: string): unknown {
  return rawCard({
    oracleId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    name,
    faces: [faceNamed(name)],
  });
}

function printingOfCard(n: number): unknown {
  return rawPrinting({
    id: `00000000-0000-4000-8000-${String(n + 500).padStart(12, '0')}`,
    oracleId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    collectorNumber: String(n),
  });
}

describe('searchCards', () => {
  it('matches the spec examples over the seed', () => {
    expect(namesFor('s')).toEqual(['Sol Ring', 'Sol Talisman', 'Swords to Plowshares']);
    expect(namesFor('sol')).toEqual(['Sol Ring', 'Sol Talisman']);
    expect(namesFor('fire')).toEqual(['Fire Covenant', 'Fire Lord Zuko']);
    expect(namesFor('Fire Lord Zuko')).toEqual(['Fire Lord Zuko']);
    expect(namesFor('zuko')).toEqual(['Fire Lord Zuko']);
    expect(namesFor('mo')).toEqual(['Monastery Mentor', 'Mountain']);
    expect(namesFor('engine')).toEqual(['Polukranos Reborn // Polukranos, Engine of Ruin']);
    expect(namesFor('plowshares')).toEqual(['Swords to Plowshares']);
  });

  it('finds nothing for an unknown or empty query', () => {
    expect(namesFor('xyz')).toEqual([]);
    expect(namesFor('')).toEqual([]);
    expect(namesFor('   ')).toEqual([]);
    expect(namesFor('ring sol')).toEqual([]);
  });

  it('normalises the query as names are normalised', () => {
    expect(namesFor('  FIRE  lord ')).toEqual(['Fire Lord Zuko']);
    expect(namesFor('fire-lord')).toEqual(['Fire Lord Zuko']);
    expect(namesFor('SOL')).toEqual(['Sol Ring', 'Sol Talisman']);
  });

  it('ranks exact, then name prefix, then word prefix, before name order', () => {
    const index = indexOf(
      [namedCard(11, 'Ancient Bolt'), namedCard(12, 'Bolt Rider'), namedCard(13, 'Bolt')],
      [printingOfCard(11), printingOfCard(12), printingOfCard(13)],
    );

    expect(namesFor('bolt', 8, index)).toEqual(['Bolt', 'Bolt Rider', 'Ancient Bolt']);
    expect(namesFor('bol', 8, index)).toEqual(['Bolt', 'Bolt Rider', 'Ancient Bolt']);
    expect(namesFor('rider', 8, index)).toEqual(['Bolt Rider']);
  });

  it('lists a card once, in its best tier, whichever name matched', () => {
    expect(namesFor('polukranos')).toEqual(['Polukranos Reborn // Polukranos, Engine of Ruin']);
    expect(namesFor('polukranos reborn')).toEqual([
      'Polukranos Reborn // Polukranos, Engine of Ruin',
    ]);
  });

  it('keeps only the first matches up to the limit', () => {
    expect(namesFor('s', 2)).toEqual(['Sol Ring', 'Sol Talisman']);
    expect(namesFor('s', 0)).toEqual([]);
  });
});
