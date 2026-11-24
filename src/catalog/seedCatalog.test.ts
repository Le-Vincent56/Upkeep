import { describe, expect, it } from 'vitest';
import { seedCatalog, seedIndex } from './seedCatalog';

const SOL_RING = '6ad8011d-3471-4369-9d68-b264cc027487';
const SPEC_PRINTING_IDS = [
  'c1f93f78-645b-4f21-a80b-5542f3328111',
  '46ca0b66-a000-4483-b916-f5b89e710244',
  'c44f81ca-f72f-445c-8901-3a894a2a47f9',
  'e62d3bcc-7bb4-42be-90a9-caf3c1caa29d',
  '47f7d313-8333-41fe-8bfa-c96774dac228',
];
// Added in #5b so the card field has names that share a prefix.
const ADDED_PRINTINGS = [
  { name: 'Sol Talisman', id: 'a51fb64d-cc0c-400d-971f-78c28d42043b', set: 'mh2', number: '236' },
  {
    name: 'Swords to Plowshares',
    id: '4645eebf-c9fc-4ee7-b646-61dc1205b4b0',
    set: 'trc',
    number: '429',
  },
  { name: 'Fire Covenant', id: '1a13437b-e0c7-4ca9-a0e2-b8cb1b5813ec', set: 'ecc', number: '54' },
  {
    name: 'Monastery Mentor',
    id: '2343e69d-f30e-4826-953c-fbf31c6079e6',
    set: 'tdc',
    number: '125',
  },
];
const HEADER_ART_PRINTING_IDS = [
  'e62d3bcc-7bb4-42be-90a9-caf3c1caa29d',
  '47f7d313-8333-41fe-8bfa-c96774dac228',
];
const MOM_POLUKRANOS = '47f7d313-8333-41fe-8bfa-c96774dac228';
const TLA_FIRE_LORD_ZUKO = 'e62d3bcc-7bb4-42be-90a9-caf3c1caa29d';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('seedCatalog', () => {
  it('loads the shipped seed', () => {
    expect(seedCatalog.cards).toHaveLength(8);
    expect(seedCatalog.printings).toHaveLength(9);
  });

  it('holds exactly the five spec printings and the four added for #5b', () => {
    const ids = seedCatalog.printings.map((printing) => printing.id).sort();
    expect(ids).toEqual(
      [...SPEC_PRINTING_IDS, ...ADDED_PRINTINGS.map((printing) => printing.id)].sort(),
    );
  });

  it('finds each added card by name and its printing by set and number', () => {
    for (const added of ADDED_PRINTINGS) {
      const card = seedIndex.cardByName(added.name);
      const printing = seedIndex.printingBySetAndNumber(added.set, added.number);

      expect(card?.name).toBe(added.name);
      expect(printing?.id).toBe(added.id);
      expect(printing?.oracleId).toBe(card?.oracleId);
    }
  });

  it('gives both Sol Ring printings one oracle id', () => {
    const solRings = seedCatalog.printings.filter((printing) =>
      ['c1f93f78-645b-4f21-a80b-5542f3328111', '46ca0b66-a000-4483-b916-f5b89e710244'].includes(
        printing.id,
      ),
    );
    expect(solRings.map((printing) => printing.oracleId)).toEqual([SOL_RING, SOL_RING]);
  });

  it('uses lowercase UUIDs for every id', () => {
    for (const card of seedCatalog.cards) expect(card.oracleId).toMatch(UUID);
    for (const printing of seedCatalog.printings) {
      expect(printing.id).toMatch(UUID);
      expect(printing.oracleId).toMatch(UUID);
    }
  });

  it('links to Scryfall without tracking parameters', () => {
    for (const printing of seedCatalog.printings) {
      expect(printing.scryfallUrl.startsWith('https://scryfall.com/card/')).toBe(true);
      expect(printing.scryfallUrl).not.toContain('?');
      for (const image of printing.images) {
        expect(image.normal.startsWith('https://cards.scryfall.io/')).toBe(true);
        expect(image.artCrop.startsWith('https://cards.scryfall.io/')).toBe(true);
        expect(image.artist).not.toBe('');
      }
    }
  });

  it('gives every header art printing an accent, and every accent is lowercase #rrggbb', () => {
    for (const printing of seedCatalog.printings) {
      for (const image of printing.images) {
        if (image.accent !== undefined) expect(image.accent).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
    for (const id of HEADER_ART_PRINTING_IDS) {
      const printing = seedCatalog.printings.find((candidate) => candidate.id === id);
      expect(printing?.images[0]?.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('keeps the approved accent for Fire Lord Zuko', () => {
    const zuko = seedCatalog.printings.find((printing) => printing.id === TLA_FIRE_LORD_ZUKO);
    expect(zuko?.images[0]?.accent).toBe('#e8662a');
  });

  it('gives the double-faced commander a front and back image', () => {
    const polukranos = seedCatalog.printings.find((printing) => printing.id === MOM_POLUKRANOS);
    expect(polukranos?.images).toHaveLength(2);
    expect(polukranos?.images[0]?.normal).toContain('/front/');
    expect(polukranos?.images[1]?.normal).toContain('/back/');
  });
});
