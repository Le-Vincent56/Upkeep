import { describe, expect, it } from 'vitest';
import { DRAFT_DETAIL, HEADER_ART, ZUKO_DETAIL } from '../../adapters/fixtures/walkthroughDecks';
import { buildCatalogIndex } from '../../catalog/catalogIndex';
import { loadCatalog } from '../../catalog/loadCatalog';
import { seedIndex } from '../../catalog/seedCatalog';
import { rawCatalog, TEST_PRINTING_ID } from '../../catalog/testCatalog';
import type { Printing } from '../../catalog/types';
import { IDS, PRINTINGS } from '../../planning/fixtures/zukoHydras';
import type { Allocation } from '../../planning/types';
import {
  allocationLine,
  blockPhrase,
  colorSymbols,
  deckCountLabel,
  deckFacts,
  displayNames,
  filteredLine,
  headerArt,
  keepTogetherLabel,
  manaCostLabel,
  printingLabel,
  rowNeeds,
  rowSuffix,
  rowTitle,
  rowTone,
  showingLabel,
  STATUS_LABELS,
  statusSummary,
} from './describe';
import { inBox, row, rowFor, toAcquire, toMove, walkthroughRows } from './testRows';

const names = displayNames(ZUKO_DETAIL);

function seeded(printingId: string): Printing {
  const printing = seedIndex.printingById(printingId);
  if (printing === undefined) throw new Error(`Printing ${printingId} is not seeded`);

  return printing;
}

function only(allocations: readonly Allocation[], status: Allocation['status']): Allocation {
  const found = allocations.find((allocation) => allocation.status === status);
  if (found === undefined) throw new Error(`No ${status} allocation`);

  return found;
}

describe('displayNames', () => {
  it('resolves deck and location names, falling back to the id', () => {
    expect(names.deckName(IDS.hydras)).toBe('Hydras');
    expect(names.locationName(IDS.binder)).toBe('Binder');
    expect(names.locationName(IDS.zukoBox)).toBe('Zuko box');
    expect(names.deckName('deck-unknown')).toBe('deck-unknown');
    expect(names.locationName('loc-unknown')).toBe('loc-unknown');
  });
});

describe('printingLabel', () => {
  it('names set and collector number, with an optional finish', () => {
    const commanderMasters = seeded(PRINTINGS.solRingCommanderMasters);

    expect(printingLabel(commanderMasters, null)).toBe('CMM 410');
    expect(printingLabel(commanderMasters, 'foil')).toBe('CMM 410 · Foil');
    expect(printingLabel(commanderMasters, 'etched')).toBe('CMM 410 · Etched');
    expect(printingLabel(commanderMasters, 'nonfoil')).toBe('CMM 410 · Nonfoil');
  });
});

describe('rowTitle', () => {
  it('reads name and quantity, plus a required printing', () => {
    const { rows } = walkthroughRows();

    expect(rowTitle(rowFor(rows, IDS.zukoMountain))).toBe('Mountain ×4');
    expect(rowTitle(rowFor(rows, IDS.zukoMaybeSolRing))).toBe('Sol Ring ×1 · TLE 316');
  });
});

describe('rowSuffix', () => {
  it('reads the quantity and a required printing, without the name', () => {
    const { rows } = walkthroughRows();

    expect(rowSuffix(rowFor(rows, IDS.zukoMountain))).toBe('×4');
    expect(rowSuffix(rowFor(rows, IDS.zukoMaybeSolRing))).toBe('×1 · TLE 316');
  });
});

describe('rowNeeds', () => {
  const partlyOwned = row({
    quantity: 4,
    demand: 4,
    allocations: [inBox(1, IDS.zukoBox), toMove(2, IDS.binder, 'loose'), toAcquire(1)],
  });

  it('lists what a row still needs', () => {
    const kept = walkthroughRows([IDS.hydras]).rows;
    const borrowed = walkthroughRows([]).rows;

    expect(rowNeeds(rowFor(kept, IDS.zukoMountain))).toEqual([
      { status: 'toMove', text: '2 to move' },
    ]);
    expect(rowNeeds(rowFor(kept, IDS.zukoSolRing))).toEqual([
      { status: 'toAcquire', text: '1 to acquire' },
    ]);
    expect(rowNeeds(rowFor(borrowed, IDS.zukoSolRing))).toEqual([
      { status: 'toMove', text: '1 to move' },
    ]);
  });

  it('is empty for a row fully in its box, and for an idea', () => {
    expect(rowNeeds(row({ allocations: [inBox(1, IDS.zukoBox)] }))).toEqual([]);
    expect(rowNeeds(rowFor(walkthroughRows().rows, IDS.zukoMaybeSolRing))).toEqual([]);
  });

  it('shows both needs on a partly owned row, to move first', () => {
    expect(rowNeeds(partlyOwned)).toEqual([
      { status: 'toMove', text: '2 to move' },
      { status: 'toAcquire', text: '1 to acquire' },
    ]);
  });

  it('adds up copies from several sources', () => {
    const twoSources = row({
      quantity: 3,
      demand: 3,
      allocations: [
        toMove(2, IDS.binder, 'loose'),
        toMove(1, IDS.hydrasBox, 'surplus', { boxDeckId: IDS.hydras }),
      ],
    });

    expect(rowNeeds(twoSources)).toEqual([{ status: 'toMove', text: '3 to move' }]);
  });

  describe('rowTone', () => {
    it('greys only a row with nothing owned, and marks ideas', () => {
      const kept = walkthroughRows([IDS.hydras]).rows;

      expect(rowTone(rowFor(kept, IDS.zukoSolRing))).toBe('unowned');
      expect(rowTone(rowFor(kept, IDS.zukoMountain))).toBe('owned');
      expect(rowTone(rowFor(kept, IDS.zukoMaybeSolRing))).toBe('idea');
    });

    it('treats a partly owned row, and a row with no allocations, as owned', () => {
      expect(rowTone(partlyOwned)).toBe('owned');
      expect(rowTone(row())).toBe('owned');
    });
  });
});

describe('statusSummary', () => {
  it('lists each nonzero status in order', () => {
    const kept = walkthroughRows([IDS.hydras]).rows;
    const borrowed = walkthroughRows([]).rows;

    expect(statusSummary(rowFor(kept, IDS.zukoMountain))).toBe('2 in deck box · 2 to move');
    expect(statusSummary(rowFor(kept, IDS.zukoSolRing))).toBe('1 to acquire');
    expect(statusSummary(rowFor(borrowed, IDS.zukoSolRing))).toBe('1 to move');
  });

  it('marks a Maybeboard idea as not counted', () => {
    expect(statusSummary(rowFor(walkthroughRows().rows, IDS.zukoMaybeSolRing))).toBe(
      'Idea · not counted',
    );
  });
});

describe('allocationLine', () => {
  const plain = row();

  it.each([
    ['in box', inBox(2, IDS.zukoBox), '2 in Zuko box'],
    ['loose', toMove(2, IDS.binder, 'loose'), '2 to move from Binder'],
    [
      'surplus',
      toMove(1, IDS.hydrasBox, 'surplus', { boxDeckId: IDS.hydras }),
      '1 to move from Hydras box (spare copy)',
    ],
    [
      'borrowed',
      toMove(1, IDS.hydrasBox, 'borrowed', {
        boxDeckId: IDS.hydras,
        leavesShortDeckId: IDS.hydras,
      }),
      '1 to move from Hydras box · leaves Hydras short',
    ],
    ['not owned', toAcquire(1), '1 to acquire · not enough owned'],
    [
      'two blocks',
      toAcquire(1, [
        { kind: 'protected', deckId: IDS.hydras, quantity: 1 },
        { kind: 'otherTarget', deckId: IDS.draft, quantity: 1 },
      ]),
      '1 to acquire · Hydras is kept together; going to Sol Ring Draft',
    ],
  ] as const)('%s', (_case, allocation, expected) => {
    expect(allocationLine(allocation, plain, names, seedIndex)).toBe(expected);
  });

  it('adds a printing qualifier when the source differs from the display printing', () => {
    const commanderMastersRow = row({ displayPrinting: seeded(PRINTINGS.solRingCommanderMasters) });
    const avatarMove = toMove(1, IDS.binder, 'loose', { printingId: PRINTINGS.solRingAvatar });
    const sameMove = toMove(1, IDS.binder, 'loose', {
      printingId: PRINTINGS.solRingCommanderMasters,
    });

    expect(allocationLine(avatarMove, commanderMastersRow, names, seedIndex)).toBe(
      '1 to move from Binder · TLE 316',
    );
    expect(allocationLine(sameMove, commanderMastersRow, names, seedIndex)).toBe(
      '1 to move from Binder',
    );
  });
});

describe('blockPhrase', () => {
  it.each([
    ['protected', IDS.hydras, 'Hydras is kept together'],
    ['target', IDS.draft, "kept in Sol Ring Draft's box"],
    ['otherTarget', IDS.draft, 'going to Sol Ring Draft'],
    ['sameDeck', IDS.zuko, 'used by another entry in this deck'],
  ] as const)('%s', (kind, deckId, expected) => {
    expect(blockPhrase({ kind, deckId, quantity: 1 }, names)).toBe(expected);
  });
});

describe('filteredLine', () => {
  it('reads the walkthrough lines', () => {
    const kept = walkthroughRows([IDS.hydras]).rows;
    const borrowed = walkthroughRows([]).rows;
    const mountain = rowFor(kept, IDS.zukoMountain);
    const keptSolRing = rowFor(kept, IDS.zukoSolRing);
    const borrowedSolRing = rowFor(borrowed, IDS.zukoSolRing);

    expect(filteredLine(only(mountain.allocations, 'toMove'), mountain, names, seedIndex)).toBe(
      '2 to move from Binder · 4 wanted',
    );
    expect(
      filteredLine(only(keptSolRing.allocations, 'toAcquire'), keptSolRing, names, seedIndex),
    ).toBe('1 to acquire · Hydras is kept together · 1 wanted');
    expect(
      filteredLine(only(borrowedSolRing.allocations, 'toMove'), borrowedSolRing, names, seedIndex),
    ).toBe('1 to move from Hydras box · leaves Hydras short · 1 wanted');
  });
});

describe('keepTogetherLabel', () => {
  it.each([
    [[], 1, 'Keep together · None'],
    [['Hydras'], 1, 'Keep together · Hydras'],
    [['Hydras', 'Sol Ring Draft'], 2, 'Keep together · Hydras, Sol Ring Draft'],
    [[], 0, 'Keep together · No other assembled decks'],
  ] as const)('%j of %i offered', (protectedNames, offered, expected) => {
    expect(keepTogetherLabel(protectedNames, offered)).toBe(expected);
  });
});

describe('deck header', () => {
  it('reads format and card count', () => {
    expect(deckFacts(ZUKO_DETAIL, 5)).toBe('Commander · 5 cards');
    expect(deckFacts(DRAFT_DETAIL, 1)).toBe('Custom · 1 card');
  });

  it('turns colors into symbol codes with one spoken label', () => {
    expect(colorSymbols(['B', 'R', 'W'])).toEqual({
      codes: ['B', 'R', 'W'],
      label: 'Black, Red, White',
    });
    expect(colorSymbols([])).toEqual({ codes: ['C'], label: 'Colorless' });
  });

  it('names a mana cost for assistive technology', () => {
    expect(manaCostLabel(['1', 'R'])).toBe('Mana cost: 1 R');
  });

  it('resolves header art, its artist, and its accent', () => {
    expect(headerArt(ZUKO_DETAIL, seedIndex)).toEqual({
      artCropUrl: seeded(HEADER_ART.fireLordZuko).images[0]?.artCrop,
      artist: 'Jo Cordisco',
      accent: '#e8662a',
    });
  });

  it('has no accent when the image carries none', () => {
    const plainCatalog = buildCatalogIndex(loadCatalog(rawCatalog()));

    expect(
      headerArt({ ...ZUKO_DETAIL, headerArtPrintingId: TEST_PRINTING_ID }, plainCatalog),
    ).toEqual({
      artCropUrl: 'https://cards.scryfall.io/art_crop/front/0/0/test.jpg',
      artist: 'Test Artist',
      accent: null,
    });
  });

  it('has no header art without a printing, or for an unknown one', () => {
    expect(headerArt(DRAFT_DETAIL, seedIndex)).toBeNull();
    expect(
      headerArt({ ...ZUKO_DETAIL, headerArtPrintingId: 'printing-unknown' }, seedIndex),
    ).toBeNull();
  });
});

describe('counts', () => {
  it('counts cards with the right plural', () => {
    expect(deckCountLabel(5)).toBe('5 cards');
    expect(deckCountLabel(1)).toBe('1 card');
    expect(deckCountLabel(0)).toBe('0 cards');
    expect(showingLabel(2, 5)).toBe('Showing 2 of 5 cards');
    expect(showingLabel(1, 1)).toBe('Showing 1 of 1 card');
  });

  it('labels the three quantities', () => {
    expect(STATUS_LABELS).toEqual({
      inBox: 'In deck box',
      toMove: 'Available to move',
      toAcquire: 'Need to acquire',
    });
  });
});
