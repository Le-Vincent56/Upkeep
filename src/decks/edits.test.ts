import { describe, expect, it } from 'vitest';
import { seedIndex } from '../catalog/seedCatalog';
import {
  applyDeckEdit,
  DeckEditError,
  editedEntryId,
  findMatchingEntry,
  type DeckEdit,
} from './edits';
import type { DeckEntry } from './types';

// The walkthrough's Zuko entries, restated here because src/decks may not import src/planning.
const CARDS = {
  solRing: '6ad8011d-3471-4369-9d68-b264cc027487',
  mountain: 'a3fb7228-e76b-4e96-a40e-20b5fed75685',
  fireLordZuko: 'a129423d-c886-4120-96f7-c2517ea7eb83',
} as const;

const PRINTINGS = {
  solRingAvatar: 'c1f93f78-645b-4f21-a80b-5542f3328111',
  solRingCommanderMasters: '46ca0b66-a000-4483-b916-f5b89e710244',
  mountain: 'c44f81ca-f72f-445c-8901-3a894a2a47f9',
} as const;

const IDS = {
  zukoSolRing: 'entry-zuko-sol-ring',
  zukoMountain: 'entry-zuko-mountain',
  zukoMaybeSolRing: 'entry-zuko-maybe-sol-ring',
} as const;

const NEW_ENTRY: DeckEntry = {
  id: 'entry-zuko-commander',
  oracleId: CARDS.fireLordZuko,
  section: 'commander',
  quantity: 1,
  printing: null,
};

function zukoEntries(): readonly DeckEntry[] {
  const entries: DeckEntry[] = [
    { id: IDS.zukoSolRing, oracleId: CARDS.solRing, section: 'main', quantity: 1, printing: null },
    {
      id: IDS.zukoMountain,
      oracleId: CARDS.mountain,
      section: 'main',
      quantity: 4,
      printing: null,
    },
    {
      id: IDS.zukoMaybeSolRing,
      oracleId: CARDS.solRing,
      section: 'maybeboard',
      quantity: 1,
      printing: { printingId: PRINTINGS.solRingAvatar, finish: null },
    },
  ];

  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

function apply(edit: DeckEdit, entries: readonly DeckEntry[] = zukoEntries()): DeckEntry[] {
  return applyDeckEdit(entries, edit, seedIndex);
}

function entryOf(entries: readonly DeckEntry[], id: string): DeckEntry {
  const found = entries.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`No entry ${id}`);

  return found;
}

function rejection(edit: DeckEdit): { code: string; message: string } {
  try {
    apply(edit);
  } catch (error) {
    if (error instanceof DeckEditError) return { code: error.code, message: error.message };
    throw error;
  }

  throw new Error('Expected a DeckEditError');
}

describe('applyDeckEdit', () => {
  it('sets one entry quantity without changing its input', () => {
    const entries = zukoEntries();
    const before = structuredClone(entries);
    const result = apply({ kind: 'setQuantity', entryId: IDS.zukoMountain, quantity: 6 }, entries);

    expect(entryOf(result, IDS.zukoMountain).quantity).toBe(6);
    expect(entryOf(result, IDS.zukoSolRing)).toBe(entryOf(entries, IDS.zukoSolRing));
    expect(entries).toEqual(before);
  });

  it('accepts quantities from 1 to 999', () => {
    for (const quantity of [1, 999]) {
      const result = apply({ kind: 'setQuantity', entryId: IDS.zukoMountain, quantity });
      expect(entryOf(result, IDS.zukoMountain).quantity).toBe(quantity);
    }
  });

  it('rejects a quantity that is not a whole number from 1 to 999', () => {
    for (const quantity of [0, 1000, 2.5, Number.NaN]) {
      expect(rejection({ kind: 'setQuantity', entryId: IDS.zukoMountain, quantity })).toEqual({
        code: 'badQuantity',
        message: 'A quantity must be a whole number from 1 to 999',
      });
    }
  });

  it('moves an entry to another section', () => {
    const result = apply({ kind: 'setSection', entryId: IDS.zukoMaybeSolRing, section: 'main' });

    expect(entryOf(result, IDS.zukoMaybeSolRing).section).toBe('main');
  });

  it('requires a printing, with or without a finish', () => {
    const foil = { printingId: PRINTINGS.solRingCommanderMasters, finish: 'foil' } as const;
    const anyFinish = { printingId: PRINTINGS.solRingAvatar, finish: null };

    const withFoil = apply({ kind: 'setPrinting', entryId: IDS.zukoSolRing, printing: foil });
    const withAny = apply({ kind: 'setPrinting', entryId: IDS.zukoSolRing, printing: anyFinish });

    expect(entryOf(withFoil, IDS.zukoSolRing).printing).toEqual(foil);
    expect(entryOf(withAny, IDS.zukoSolRing).printing).toEqual(anyFinish);
  });

  it('clears a required printing', () => {
    const result = apply({ kind: 'setPrinting', entryId: IDS.zukoMaybeSolRing, printing: null });

    expect(entryOf(result, IDS.zukoMaybeSolRing).printing).toBeNull();
  });

  it('rejects a finish the printing does not have', () => {
    expect(
      rejection({
        kind: 'setPrinting',
        entryId: IDS.zukoSolRing,
        printing: { printingId: PRINTINGS.solRingAvatar, finish: 'foil' },
      }),
    ).toEqual({ code: 'noSuchFinish', message: 'TLE 316 has no foil finish' });
  });

  it('rejects a printing of another card, or an unknown printing', () => {
    expect(
      rejection({
        kind: 'setPrinting',
        entryId: IDS.zukoSolRing,
        printing: { printingId: PRINTINGS.mountain, finish: null },
      }),
    ).toEqual({
      code: 'wrongPrinting',
      message: `Printing ${PRINTINGS.mountain} isn't a printing of Sol Ring`,
    });
    expect(
      rejection({
        kind: 'setPrinting',
        entryId: IDS.zukoSolRing,
        printing: { printingId: 'printing-missing', finish: null },
      }).code,
    ).toBe('wrongPrinting');
  });

  it('removes an entry and keeps the order of the others', () => {
    const result = apply({ kind: 'removeEntry', entryId: IDS.zukoMountain });

    expect(result.map((entry) => entry.id)).toEqual([IDS.zukoSolRing, IDS.zukoMaybeSolRing]);
  });

  it('adds an entry at the end, or at a position clamped to the list', () => {
    const idsAfterAdding = (at?: number) =>
      apply(
        at === undefined
          ? { kind: 'addEntry', entry: NEW_ENTRY }
          : { kind: 'addEntry', entry: NEW_ENTRY, at },
      ).map((entry) => entry.id);

    expect(idsAfterAdding()).toEqual([
      IDS.zukoSolRing,
      IDS.zukoMountain,
      IDS.zukoMaybeSolRing,
      NEW_ENTRY.id,
    ]);
    expect(idsAfterAdding(1)).toEqual([
      IDS.zukoSolRing,
      NEW_ENTRY.id,
      IDS.zukoMountain,
      IDS.zukoMaybeSolRing,
    ]);
    expect(idsAfterAdding(-3)[0]).toBe(NEW_ENTRY.id);
    expect(idsAfterAdding(99).at(-1)).toBe(NEW_ENTRY.id);
  });

  it('puts a removed entry back where it was', () => {
    const entries = zukoEntries();
    const mountain = entryOf(entries, IDS.zukoMountain);
    const removed = apply({ kind: 'removeEntry', entryId: IDS.zukoMountain }, entries);

    expect(apply({ kind: 'addEntry', entry: mountain, at: 1 }, removed)).toEqual(entries);
  });

  it('rejects an added entry that is already there, unknown, or invalid', () => {
    const mountain = entryOf(zukoEntries(), IDS.zukoMountain);

    expect(rejection({ kind: 'addEntry', entry: mountain })).toEqual({
      code: 'duplicateEntry',
      message: `This deck already has entry ${IDS.zukoMountain}`,
    });
    expect(
      rejection({ kind: 'addEntry', entry: { ...NEW_ENTRY, oracleId: 'card-missing' } }),
    ).toEqual({ code: 'unknownCard', message: 'No card with id card-missing' });
    expect(rejection({ kind: 'addEntry', entry: { ...NEW_ENTRY, quantity: 0 } }).code).toBe(
      'badQuantity',
    );
    expect(
      rejection({
        kind: 'addEntry',
        entry: { ...NEW_ENTRY, printing: { printingId: PRINTINGS.mountain, finish: null } },
      }).code,
    ).toBe('wrongPrinting');
  });

  it('rejects every edit of an entry the deck does not have', () => {
    const edits: DeckEdit[] = [
      { kind: 'setQuantity', entryId: 'entry-missing', quantity: 2 },
      { kind: 'setSection', entryId: 'entry-missing', section: 'main' },
      { kind: 'setPrinting', entryId: 'entry-missing', printing: null },
      { kind: 'removeEntry', entryId: 'entry-missing' },
    ];

    for (const edit of edits) {
      expect(rejection(edit)).toEqual({
        code: 'unknownEntry',
        message: 'This deck has no entry entry-missing',
      });
    }
  });

  it('returns equal entries for an edit that changes nothing', () => {
    const entries = zukoEntries();
    const result = apply({ kind: 'setQuantity', entryId: IDS.zukoMountain, quantity: 4 }, entries);

    expect(result).toEqual(entries);
  });
});

describe('editedEntryId', () => {
  it('names the entry an edit changes', () => {
    expect(editedEntryId({ kind: 'removeEntry', entryId: IDS.zukoMountain })).toBe(
      IDS.zukoMountain,
    );
    expect(editedEntryId({ kind: 'addEntry', entry: NEW_ENTRY })).toBe(NEW_ENTRY.id);
    expect(editedEntryId({ kind: 'addCard', entry: NEW_ENTRY })).toBe(NEW_ENTRY.id);
  });
});

function card(
  oracleId: string,
  section: DeckEntry['section'],
  quantity: number,
  printing: DeckEntry['printing'] = null,
  id = 'entry-new',
): DeckEntry {
  return { id, oracleId, section, quantity, printing };
}

function addCard(entry: DeckEntry, entries: readonly DeckEntry[] = zukoEntries()): DeckEntry[] {
  return apply({ kind: 'addCard', entry }, entries);
}

function addCardRejection(entry: DeckEntry): { code: string; message: string } {
  return rejection({ kind: 'addCard', entry });
}

describe('addCard', () => {
  it('appends a card the deck has no matching entry for', () => {
    const result = addCard(NEW_ENTRY);

    expect(result).toHaveLength(4);
    expect(result[3]).toEqual(NEW_ENTRY);
  });

  it('raises the matching entry in place and leaves the sent ID unused', () => {
    const entries = zukoEntries();
    const result = addCard(card(CARDS.solRing, 'main', 1), entries);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ ...entryOf(entries, IDS.zukoSolRing), quantity: 2 });
    expect(result.some((entry) => entry.id === 'entry-new')).toBe(false);
    expect(entries[0]?.quantity).toBe(1);
  });

  it('appends when the printing differs', () => {
    const exact = { printingId: PRINTINGS.solRingCommanderMasters, finish: null };
    const result = addCard(card(CARDS.solRing, 'main', 1, exact));

    expect(result).toHaveLength(4);
    expect(result[3]?.printing).toEqual(exact);
    expect(entryOf(result, IDS.zukoSolRing).quantity).toBe(1);
  });

  it('raises an entry with the same exact printing and finish', () => {
    const tle = { printingId: PRINTINGS.solRingAvatar, finish: null };
    const result = addCard(card(CARDS.solRing, 'maybeboard', 1, tle));

    expect(result).toHaveLength(3);
    expect(entryOf(result, IDS.zukoMaybeSolRing).quantity).toBe(2);
  });

  it('appends when only the finish differs', () => {
    const tleNonfoil = { printingId: PRINTINGS.solRingAvatar, finish: 'nonfoil' as const };
    const result = addCard(card(CARDS.solRing, 'maybeboard', 1, tleNonfoil));

    expect(result).toHaveLength(4);
    expect(entryOf(result, IDS.zukoMaybeSolRing).quantity).toBe(1);
  });

  it('appends when the section differs', () => {
    const result = addCard(card(CARDS.mountain, 'sideboard', 2));

    expect(result).toHaveLength(4);
    expect(entryOf(result, IDS.zukoMountain).quantity).toBe(4);
  });

  it('raises the first of several matching entries', () => {
    const entries = [
      ...zukoEntries(),
      card(CARDS.solRing, 'main', 3, null, 'entry-second-sol-ring'),
    ];
    const result = addCard(card(CARDS.solRing, 'main', 1), entries);

    expect(entryOf(result, IDS.zukoSolRing).quantity).toBe(2);
    expect(entryOf(result, 'entry-second-sol-ring').quantity).toBe(3);
  });

  it('keeps a raised quantity within 999', () => {
    expect(addCardRejection(card(CARDS.mountain, 'main', 996))).toEqual({
      code: 'badQuantity',
      message: 'A quantity must be a whole number from 1 to 999',
    });
    expect(entryOf(addCard(card(CARDS.mountain, 'main', 995)), IDS.zukoMountain).quantity).toBe(
      999,
    );
  });

  it('rejects an addition sent twice instead of merging it into the entry it made', () => {
    const once = addCard(NEW_ENTRY);

    let caught: unknown;
    try {
      addCard(NEW_ENTRY, once);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DeckEditError);
    expect((caught as DeckEditError).code).toBe('duplicateEntry');
  });

  it('checks the card, quantity, and printing as addEntry does', () => {
    expect(addCardRejection({ ...NEW_ENTRY, oracleId: 'card-missing' })).toEqual({
      code: 'unknownCard',
      message: 'No card with id card-missing',
    });
    expect(addCardRejection({ ...NEW_ENTRY, quantity: 0 }).code).toBe('badQuantity');
    expect(
      addCardRejection(
        card(CARDS.mountain, 'main', 1, {
          printingId: PRINTINGS.solRingCommanderMasters,
          finish: null,
        }),
      ).code,
    ).toBe('wrongPrinting');
  });
});

describe('findMatchingEntry', () => {
  it('matches card, section, and printing, ignoring ID and quantity', () => {
    const entries = zukoEntries();

    expect(findMatchingEntry(entries, card(CARDS.solRing, 'main', 7, null, 'other'))?.id).toBe(
      IDS.zukoSolRing,
    );
    expect(
      findMatchingEntry(
        entries,
        card(CARDS.solRing, 'maybeboard', 1, { printingId: PRINTINGS.solRingAvatar, finish: null }),
      )?.id,
    ).toBe(IDS.zukoMaybeSolRing);
  });

  it('tells any printing, a printing, and a finish apart', () => {
    const entries = zukoEntries();

    expect(findMatchingEntry(entries, card(CARDS.solRing, 'maybeboard', 1))).toBeUndefined();
    expect(
      findMatchingEntry(
        entries,
        card(CARDS.solRing, 'main', 1, { printingId: PRINTINGS.solRingAvatar, finish: null }),
      ),
    ).toBeUndefined();
    expect(
      findMatchingEntry(
        entries,
        card(CARDS.solRing, 'maybeboard', 1, {
          printingId: PRINTINGS.solRingAvatar,
          finish: 'nonfoil',
        }),
      ),
    ).toBeUndefined();
  });
});
