import { describe, expect, it } from 'vitest';
import { CatalogError, loadCatalog } from './loadCatalog';
import { rawCard, rawCatalog, rawPrinting, TEST_ORACLE_ID, TEST_PRINTING_ID } from './testCatalog';

const OTHER_PRINTING_ID = '00000000-0000-4000-8000-000000000102';

function problemsOf(raw: unknown): readonly string[] {
  try {
    loadCatalog(raw);
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    return (error as CatalogError).problems;
  }
  throw new Error('expected loadCatalog to throw');
}

function expectProblem(raw: unknown, ...fragments: string[]): void {
  const problems = problemsOf(raw);
  const match = problems.find((problem) =>
    fragments.every((fragment) => problem.includes(fragment)),
  );
  expect(
    match,
    `no problem mentions ${fragments.join(' + ')} in:\n${problems.join('\n')}`,
  ).toBeDefined();
}

describe('loadCatalog', () => {
  it('returns a valid catalog unchanged', () => {
    const raw = rawCatalog();
    expect(loadCatalog(raw)).toEqual(raw);
  });

  it('rejects a value that is not an object', () => {
    expect(() => loadCatalog(null)).toThrow(CatalogError);
    expect(() => loadCatalog([])).toThrow(CatalogError);
  });

  it('rejects another schema version', () => {
    expectProblem({ ...rawCatalog(), schemaVersion: 2 }, 'catalog', 'schemaVersion');
  });

  it('reports a null record instead of crashing', () => {
    expectProblem(rawCatalog([rawCard()], [null]), 'printings[0]');
  });

  it('rejects a numeric collector number', () => {
    expectProblem(
      rawCatalog([rawCard()], [rawPrinting({ collectorNumber: 316 })]),
      TEST_PRINTING_ID,
      'collectorNumber',
    );
  });

  it('rejects a mistyped card field', () => {
    expectProblem(rawCatalog([rawCard({ manaValue: '1' })]), TEST_ORACLE_ID, 'manaValue');
  });

  it('rejects an unknown color', () => {
    const face = {
      name: 'Test Relic',
      manaCost: '{1}',
      typeLine: 'Artifact',
      oracleText: '',
      colors: ['X'],
    };
    expectProblem(rawCatalog([rawCard({ faces: [face] })]), TEST_ORACLE_ID, 'colors');
  });

  it('rejects an unknown layout', () => {
    expectProblem(rawCatalog([rawCard({ layout: 'split' })]), TEST_ORACLE_ID, 'layout');
  });

  it('rejects a card with no faces', () => {
    expectProblem(rawCatalog([rawCard({ faces: [] })]), TEST_ORACLE_ID, 'faces');
  });

  it('rejects empty finishes', () => {
    expectProblem(
      rawCatalog([rawCard()], [rawPrinting({ finishes: [] })]),
      TEST_PRINTING_ID,
      'finishes',
    );
  });

  it('rejects an unknown finish', () => {
    expectProblem(
      rawCatalog([rawCard()], [rawPrinting({ finishes: ['gold'] })]),
      TEST_PRINTING_ID,
      'finishes',
    );
  });

  it('rejects a printing of an unknown card', () => {
    const stray = rawPrinting({
      id: OTHER_PRINTING_ID,
      oracleId: '00000000-0000-4000-8000-0000000000ff',
      collectorNumber: '2',
    });
    expectProblem(rawCatalog([rawCard()], [rawPrinting(), stray]), OTHER_PRINTING_ID, 'oracleId');
  });

  it('rejects a card with no printings', () => {
    expectProblem(rawCatalog([rawCard()], []), TEST_ORACLE_ID, 'printing');
  });

  it('rejects duplicate oracle ids', () => {
    expectProblem(rawCatalog([rawCard(), rawCard()]), TEST_ORACLE_ID, 'duplicate');
  });

  it('rejects duplicate printing ids', () => {
    const twin = rawPrinting({ collectorNumber: '2' });
    expectProblem(rawCatalog([rawCard()], [rawPrinting(), twin]), TEST_PRINTING_ID, 'duplicate');
  });

  it('rejects a duplicate set and collector number', () => {
    const first = rawPrinting({ setCode: 'tle', collectorNumber: '316' });
    const second = rawPrinting({ id: OTHER_PRINTING_ID, setCode: 'tle', collectorNumber: '316' });
    expectProblem(rawCatalog([rawCard()], [first, second]), 'tle', '316', 'duplicate');
  });

  it('rejects an image count that differs from the face count', () => {
    const image = {
      normal: 'https://cards.scryfall.io/normal/front/0/0/test.jpg',
      artCrop: 'https://cards.scryfall.io/art_crop/front/0/0/test.jpg',
      artist: 'Test Artist',
    };
    expectProblem(
      rawCatalog([rawCard()], [rawPrinting({ images: [image, image] })]),
      TEST_PRINTING_ID,
      'images',
    );
  });

  it('reports every problem, not only the first', () => {
    const raw = rawCatalog([rawCard({ layout: 'split' })], [rawPrinting({ finishes: ['gold'] })]);
    expectProblem(raw, TEST_ORACLE_ID, 'layout');
    expectProblem(raw, TEST_PRINTING_ID, 'finishes');

    expect(() => loadCatalog(raw)).toThrow(/layout[\s\S]*finishes|finishes[\s\S]*layout/);
  });
});
