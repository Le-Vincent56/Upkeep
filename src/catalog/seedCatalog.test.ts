import { describe, expect, it } from 'vitest';
import { seedCatalog } from './seedCatalog';

const SOL_RING = '6ad8011d-3471-4369-9d68-b264cc027487';
const SPEC_PRINTING_IDS = [
  'c1f93f78-645b-4f21-a80b-5542f3328111',
  '46ca0b66-a000-4483-b916-f5b89e710244',
  'c44f81ca-f72f-445c-8901-3a894a2a47f9',
  'e62d3bcc-7bb4-42be-90a9-caf3c1caa29d',
  '47f7d313-8333-41fe-8bfa-c96774dac228',
];
const MOM_POLUKRANOS = '47f7d313-8333-41fe-8bfa-c96774dac228';
const TLA_FIRE_LORD_ZUKO = 'e62d3bcc-7bb4-42be-90a9-caf3c1caa29d';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('seedCatalog', () => {
  it('loads the shipped seed', () => {
    expect(seedCatalog.cards).toHaveLength(4);
    expect(seedCatalog.printings).toHaveLength(5);
  });

  it('holds exactly the five spec printings', () => {
    const ids = seedCatalog.printings.map((printing) => printing.id).sort();
    expect(ids).toEqual([...SPEC_PRINTING_IDS].sort());
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

  it('gives every image a lowercase #rrggbb accent', () => {
    for (const printing of seedCatalog.printings) {
      for (const image of printing.images) expect(image.accent).toMatch(/^#[0-9a-f]{6}$/);
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
