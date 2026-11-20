import { describe, expect, it } from 'vitest';
import { seedIndex } from '../../catalog/seedCatalog';
import { allCases } from '../planningCases';
import { exact } from '../testSnapshot';
import { validateSnapshot } from '../validateSnapshot';
import { CARDS, IDS, PRINTINGS, walkthroughSnapshot } from './zukoHydras';

function deckOf(id: string) {
  const deck = walkthroughSnapshot().decks.find((d) => d.id === id);
  if (deck === undefined) throw new Error(`no deck ${id}`);
  return deck;
}

function quantityAt(locationId: string, printingId: string, avatarSolRingInBinder = false) {
  return walkthroughSnapshot({ avatarSolRingInBinder })
    .stock.filter((row) => row.locationId === locationId && row.printingId === printingId)
    .reduce((sum, row) => sum + row.quantity, 0);
}

describe('Zuko/Hydras fixture', () => {
  it('uses only seeded printings', () => {
    const fixture = walkthroughSnapshot({
      avatarSolRingInBinder: true,
      zukoSolRing: exact(PRINTINGS.solRingCommanderMasters),
    });
    const references = [
      ...fixture.stock.map((row) => [row.printingId, row.oracleId] as const),
      ...fixture.decks.flatMap((d) =>
        d.entries.flatMap((e) =>
          e.printing === null ? [] : [[e.printing.printingId, e.oracleId] as const],
        ),
      ),
    ];

    expect(references.length).toBeGreaterThan(0);
    for (const [printingId, oracleId] of references) {
      expect(seedIndex.printingById(printingId)?.oracleId).toBe(oracleId);
    }
  });

  it("matches the walkthrough's starting facts", () => {
    const zuko = deckOf(IDS.zuko);
    const eligible = zuko.entries.filter((e) => e.section !== 'maybeboard');
    expect(eligible.map((e) => [e.oracleId, e.quantity])).toEqual([
      [CARDS.solRing, 1],
      [CARDS.mountain, 4],
    ]);

    expect(quantityAt(IDS.zukoBox, PRINTINGS.mountain)).toBe(2);
    expect(quantityAt(IDS.binder, PRINTINGS.mountain)).toBe(2);
    expect(quantityAt(IDS.hydrasBox, PRINTINGS.solRingCommanderMasters)).toBe(1);

    const maybe = zuko.entries.find((e) => e.section === 'maybeboard');
    expect(maybe?.printing?.printingId).toBe(PRINTINGS.solRingAvatar);
    expect(deckOf(IDS.hydras).entries.map((e) => [e.oracleId, e.quantity])).toEqual([
      [CARDS.solRing, 1],
    ]);
    expect(deckOf(IDS.draft).boxLocationId).toBeNull();
  });

  it('adds the Avatar Sol Ring to the binder only when asked', () => {
    expect(quantityAt(IDS.binder, PRINTINGS.solRingAvatar)).toBe(0);
    expect(quantityAt(IDS.binder, PRINTINGS.solRingAvatar, true)).toBe(1);
  });

  it('passes validation in every planning case', () => {
    for (const [, { snapshot }] of allCases()) {
      expect(() => validateSnapshot(snapshot)).not.toThrow();
    }
  });
});
