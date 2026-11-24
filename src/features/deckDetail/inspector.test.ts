import { describe, expect, it } from 'vitest';
import { seedIndex } from '../../catalog/seedCatalog';
import type { DeckEdit } from '../../decks/edits';
import { CARDS, IDS, PRINTINGS } from '../../planning/fixtures/zukoHydras';
import {
  ANY,
  askedValues,
  entryOfRow,
  finishChoices,
  finishEdit,
  parseQuantity,
  printingChoices,
  printingEdit,
  togglePin,
} from './inspector';
import { rowFor, walkthroughRows } from './testRows';

describe('printingChoices', () => {
  it('offers any printing, then each printing newest first', () => {
    expect(printingChoices(CARDS.solRing, seedIndex)).toEqual([
      { value: ANY, label: 'Any printing' },
      { value: PRINTINGS.solRingAvatar, label: 'TLE 316' },
      { value: PRINTINGS.solRingCommanderMasters, label: 'CMM 410' },
    ]);
    expect(printingChoices(CARDS.mountain, seedIndex)).toEqual([
      { value: ANY, label: 'Any printing' },
      { value: PRINTINGS.mountain, label: 'TLA 285' },
    ]);
  });
});

describe('finishChoices', () => {
  it("offers any finish, then the printing's own finishes", () => {
    expect(finishChoices(PRINTINGS.solRingCommanderMasters, seedIndex)).toEqual([
      { value: ANY, label: 'Any finish' },
      { value: 'nonfoil', label: 'Nonfoil' },
      { value: 'foil', label: 'Foil' },
    ]);
    expect(finishChoices(PRINTINGS.solRingAvatar, seedIndex)).toEqual([
      { value: ANY, label: 'Any finish' },
      { value: 'nonfoil', label: 'Nonfoil' },
    ]);
  });
});

describe('printingEdit and finishEdit', () => {
  it('turns a printing choice into an edit that resets the finish', () => {
    expect(printingEdit(IDS.zukoSolRing, ANY)).toEqual({
      kind: 'setPrinting',
      entryId: IDS.zukoSolRing,
      printing: null,
    });
    expect(printingEdit(IDS.zukoSolRing, PRINTINGS.solRingCommanderMasters)).toEqual({
      kind: 'setPrinting',
      entryId: IDS.zukoSolRing,
      printing: { printingId: PRINTINGS.solRingCommanderMasters, finish: null },
    });
  });

  it('turns a finish choice into an edit that keeps the printing', () => {
    expect(finishEdit(IDS.zukoSolRing, PRINTINGS.solRingCommanderMasters, 'foil')).toEqual({
      kind: 'setPrinting',
      entryId: IDS.zukoSolRing,
      printing: { printingId: PRINTINGS.solRingCommanderMasters, finish: 'foil' },
    });
    expect(finishEdit(IDS.zukoSolRing, PRINTINGS.solRingCommanderMasters, ANY)).toEqual({
      kind: 'setPrinting',
      entryId: IDS.zukoSolRing,
      printing: { printingId: PRINTINGS.solRingCommanderMasters, finish: null },
    });
  });

  it('treats anything but a finish as any finish', () => {
    expect(finishEdit(IDS.zukoSolRing, PRINTINGS.solRingAvatar, 'constructor')).toEqual({
      kind: 'setPrinting',
      entryId: IDS.zukoSolRing,
      printing: { printingId: PRINTINGS.solRingAvatar, finish: null },
    });
  });
});

describe('askedValues', () => {
  const { rows } = walkthroughRows();
  const mountain = rowFor(rows, IDS.zukoMountain);

  it("shows the row's own values with nothing waiting", () => {
    expect(askedValues(mountain, [])).toEqual({ quantity: 4, section: 'main', printing: null });
  });

  it('shows the last value asked for, ignoring other entries', () => {
    const waiting: DeckEdit[] = [
      { kind: 'setQuantity', entryId: IDS.zukoMountain, quantity: 5 },
      { kind: 'setQuantity', entryId: IDS.zukoSolRing, quantity: 9 },
      { kind: 'setQuantity', entryId: IDS.zukoMountain, quantity: 6 },
      { kind: 'setSection', entryId: IDS.zukoMountain, section: 'sideboard' },
      {
        kind: 'setPrinting',
        entryId: IDS.zukoMountain,
        printing: { printingId: PRINTINGS.mountain, finish: 'foil' },
      },
    ];

    expect(askedValues(mountain, waiting)).toEqual({
      quantity: 6,
      section: 'sideboard',
      printing: { printingId: PRINTINGS.mountain, finish: 'foil' },
    });
  });

  it('ignores a waiting addition, which never edits an entry by its ID', () => {
    const waiting: DeckEdit[] = [
      {
        kind: 'addCard',
        entry: {
          id: IDS.zukoMountain,
          oracleId: CARDS.mountain,
          section: 'sideboard',
          quantity: 9,
          printing: null,
        },
      },
    ];

    expect(askedValues(mountain, waiting)).toEqual({
      quantity: 4,
      section: 'main',
      printing: null,
    });
  });
});

describe('parseQuantity', () => {
  it('reads a whole number from 1 to 999, ignoring spaces around it', () => {
    expect(parseQuantity('7')).toBe(7);
    expect(parseQuantity('  7 ')).toBe(7);
    expect(parseQuantity('1')).toBe(1);
    expect(parseQuantity('999')).toBe(999);
  });

  it('refuses anything else', () => {
    for (const text of ['', '0', '4.5', '1000', 'abc', '-2', '1e2', '7 cards']) {
      expect(parseQuantity(text)).toBeNull();
    }
  });
});

describe('entryOfRow', () => {
  it('gives back the deck entry a row shows', () => {
    const { rows } = walkthroughRows();

    expect(entryOfRow(rowFor(rows, IDS.zukoMountain))).toEqual({
      id: IDS.zukoMountain,
      oracleId: CARDS.mountain,
      section: 'main',
      quantity: 4,
      printing: null,
    });
    expect(entryOfRow(rowFor(rows, IDS.zukoMaybeSolRing)).printing).toEqual({
      printingId: PRINTINGS.solRingAvatar,
      finish: null,
    });
  });
});

describe('togglePin', () => {
  it('pins, unpins the same row, and moves to another row', () => {
    expect(togglePin(null, IDS.zukoMountain)).toBe(IDS.zukoMountain);
    expect(togglePin(IDS.zukoMountain, IDS.zukoMountain)).toBeNull();
    expect(togglePin(IDS.zukoMountain, IDS.zukoSolRing)).toBe(IDS.zukoSolRing);
  });
});
