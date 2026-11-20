import { describe, expect, it } from 'vitest';
import { buildCatalogIndex } from '../../catalog/catalogIndex';
import { loadCatalog } from '../../catalog/loadCatalog';
import { seedIndex } from '../../catalog/seedCatalog';
import { rawCatalog } from '../../catalog/testCatalog';
import { CARDS, IDS, PRINTINGS, walkthroughSnapshot } from '../../planning/fixtures/zukoHydras';
import { planBuild } from '../../planning/planBuild';
import { buildDeckRows, CARD_TYPE_ORDER, cardTypeGroup } from './deckRows';
import { rowFor, walkthroughRows } from './testRows';

describe('cardTypeGroup', () => {
  it.each([
    ['Artifact', 'artifact'],
    ['Basic Land — Mountain', 'land'],
    ['Artifact Creature — Golem', 'creature'],
    ['Artifact Land', 'land'],
    ['Legendary Planeswalker — Jace', 'planeswalker'],
    ['Kindred Instant — Elf', 'instant'],
    ['Sorcery', 'sorcery'],
    ['Battle — Siege', 'battle'],
    ['Enchantment — Aura', 'enchantment'],
    ['Legendary Enchantment Creature — God', 'creature'],
    ['Conspiracy', 'other'],
  ] as const)('%s → %s', (typeLine, group) => {
    expect(cardTypeGroup(typeLine)).toBe(group);
  });

  it('reads card types only, not subtypes', () => {
    expect(cardTypeGroup('Artifact — Creature Equipment')).toBe('artifact');
  });

  it('displays groups in deck-builder order', () => {
    expect(CARD_TYPE_ORDER).toEqual([
      'creature',
      'planeswalker',
      'battle',
      'instant',
      'sorcery',
      'artifact',
      'enchantment',
      'land',
      'other',
    ]);
  });
});

describe('buildDeckRows', () => {
  it('builds one row per planned entry in plan order', () => {
    const { rows } = walkthroughRows();

    expect(rows.map((candidate) => candidate.entryId)).toEqual([
      IDS.zukoSolRing,
      IDS.zukoMountain,
      IDS.zukoMaybeSolRing,
    ]);
    expect(rowFor(rows, IDS.zukoMountain)).toMatchObject({
      oracleId: CARDS.mountain,
      name: 'Mountain',
      section: 'main',
      quantity: 4,
      demand: 4,
      manaValue: 0,
      typeLine: 'Basic Land — Mountain',
      typeGroup: 'land',
    });
  });

  it("carries the front face's mana cost", () => {
    const { rows } = walkthroughRows();

    expect(rowFor(rows, IDS.zukoSolRing).manaCost).toBe('{1}');
    expect(rowFor(rows, IDS.zukoMountain).manaCost).toBe('');
  });

  it('carries the planned allocations unchanged', () => {
    const { plannedDeck, rows } = walkthroughRows();

    expect(rows.map((candidate) => candidate.allocations)).toEqual(
      plannedDeck.entries.map((entry) => entry.allocations),
    );
  });

  it('keeps the Maybeboard idea with zero demand', () => {
    const maybe = rowFor(walkthroughRows().rows, IDS.zukoMaybeSolRing);

    expect(maybe).toMatchObject({ section: 'maybeboard', quantity: 1, demand: 0, allocations: [] });
  });

  it('labels an exact printing', () => {
    expect(rowFor(walkthroughRows().rows, IDS.zukoMaybeSolRing).exactLabel).toBe('TLE 316');
    expect(rowFor(walkthroughRows().rows, IDS.zukoSolRing).exactLabel).toBeNull();

    const snapshot = walkthroughSnapshot({
      zukoSolRing: { printingId: PRINTINGS.solRingCommanderMasters, finish: 'foil' },
    });
    const plannedDeck = planBuild(snapshot, { priority: [] }).decks[0];
    if (plannedDeck === undefined) throw new Error('missing plan');
    const rows = buildDeckRows(plannedDeck, snapshot, seedIndex);

    expect(rowFor(rows, IDS.zukoSolRing).exactLabel).toBe('CMM 410 · Foil');
    expect(rowFor(rows, IDS.zukoSolRing).exactPrinting).toEqual({
      printingId: PRINTINGS.solRingCommanderMasters,
      finish: 'foil',
    });
  });

  it('picks the display printing', () => {
    const kept = walkthroughRows([IDS.hydras]).rows;
    const borrowed = walkthroughRows([]).rows;

    expect(rowFor(kept, IDS.zukoMaybeSolRing).displayPrinting?.id).toBe(PRINTINGS.solRingAvatar);
    expect(rowFor(kept, IDS.zukoSolRing).displayPrinting?.id).toBe(PRINTINGS.solRingAvatar);
    expect(rowFor(borrowed, IDS.zukoSolRing).displayPrinting?.id).toBe(
      PRINTINGS.solRingCommanderMasters,
    );
    expect(rowFor(kept, IDS.zukoMountain).displayPrinting?.id).toBe(PRINTINGS.mountain);
  });

  it('throws on a card missing from the catalog', () => {
    const { snapshot, plannedDeck } = walkthroughRows();
    const emptyCatalog = buildCatalogIndex(loadCatalog(rawCatalog()));

    expect(() => buildDeckRows(plannedDeck, snapshot, emptyCatalog)).toThrow(CARDS.solRing);
  });

  it('throws on a planned entry missing from the snapshot', () => {
    const { snapshot, plannedDeck } = walkthroughRows();
    const withoutEntries = {
      ...snapshot,
      decks: snapshot.decks.map((deck) => (deck.id === IDS.zuko ? { ...deck, entries: [] } : deck)),
    };

    expect(() => buildDeckRows(plannedDeck, withoutEntries, seedIndex)).toThrow(IDS.zukoSolRing);
  });
});
