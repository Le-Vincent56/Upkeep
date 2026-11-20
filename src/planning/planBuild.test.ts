import { describe, expect, it } from 'vitest';
import { CARDS, IDS, PRINTINGS } from './fixtures/zukoHydras';
import { planBuild } from './planBuild';
import { planningCase, type CaseName } from './planningCases';
import type { Allocation, BuildPlan, Counts, PlannedEntry } from './types';

const AVATAR = PRINTINGS.solRingAvatar;
const CMM = PRINTINGS.solRingCommanderMasters;

function plan(name: CaseName): BuildPlan {
  const { snapshot, choices } = planningCase(name);
  return planBuild(snapshot, choices);
}

function counts(demand: number, inBox: number, toMove: number, toAcquire: number): Counts {
  return { demand, inBox, toMove, toAcquire };
}

function countsOf(result: BuildPlan, deckId: string): Counts {
  const deck = result.decks.find((d) => d.deckId === deckId);
  if (deck === undefined) throw new Error(`plan has no deck ${deckId}`);
  return deck.counts;
}

function entryOf(result: BuildPlan, entryId: string): PlannedEntry {
  const found = result.decks.flatMap((d) => d.entries).find((e) => e.entryId === entryId);
  if (found === undefined) throw new Error(`plan has no entry ${entryId}`);
  return found;
}

function allocationsOf(result: BuildPlan, entryId: string): readonly Allocation[] {
  return entryOf(result, entryId).allocations;
}

function source(locationId: string, printingId: string, finish: 'nonfoil' | 'foil' = 'nonfoil') {
  return { locationId, printingId, finish };
}

function loose(quantity: number, locationId: string, printingId: string, finish?: 'foil') {
  return {
    status: 'toMove',
    quantity,
    source: source(locationId, printingId, finish),
    reason: 'loose',
    boxDeckId: null,
    leavesShortDeckId: null,
  };
}

function surplus(quantity: number, locationId: string, printingId: string, boxDeckId: string) {
  return {
    status: 'toMove',
    quantity,
    source: source(locationId, printingId),
    reason: 'surplus',
    boxDeckId,
    leavesShortDeckId: null,
  };
}

function borrowed(quantity: number, locationId: string, printingId: string, deckId: string) {
  return {
    status: 'toMove',
    quantity,
    source: source(locationId, printingId),
    reason: 'borrowed',
    boxDeckId: deckId,
    leavesShortDeckId: deckId,
  };
}

function statuses(result: BuildPlan, entryId: string) {
  return allocationsOf(result, entryId).map((a) => [a.status, a.quantity]);
}

describe('planBuild: walkthrough', () => {
  it('case 1: Hydras protected gives 2 / 2 / 1', () => {
    const result = plan('1');

    expect(countsOf(result, IDS.zuko)).toEqual(counts(5, 2, 2, 1));
    expect(allocationsOf(result, IDS.zukoMountain)).toEqual([
      { status: 'inBox', quantity: 2, source: source(IDS.zukoBox, PRINTINGS.mountain) },
      loose(2, IDS.binder, PRINTINGS.mountain),
    ]);
    expect(statuses(result, IDS.zukoSolRing)).toEqual([['toAcquire', 1]]);
    expect(entryOf(result, IDS.zukoMaybeSolRing)).toMatchObject({ demand: 0, allocations: [] });
  });

  it('case 2: unprotected gives 2 / 3 / 0 and names Hydras', () => {
    const result = plan('2');

    expect(countsOf(result, IDS.zuko)).toEqual(counts(5, 2, 3, 0));
    expect(allocationsOf(result, IDS.zukoSolRing)).toEqual([
      borrowed(1, IDS.hydrasBox, CMM, IDS.hydras),
    ]);
  });

  it('case 3a: a loose Avatar Sol Ring fills the flexible entry', () => {
    const result = plan('3a');

    expect(countsOf(result, IDS.zuko)).toEqual(counts(5, 2, 3, 0));
    expect(allocationsOf(result, IDS.zukoSolRing)).toEqual([loose(1, IDS.binder, AVATAR)]);
  });

  it("case 3b: requiring Hydras's printing restores the shortage", () => {
    const result = plan('3b');

    expect(countsOf(result, IDS.zuko)).toEqual(counts(5, 2, 2, 1));
    expect(statuses(result, IDS.zukoSolRing)).toEqual([['toAcquire', 1]]);
  });

  it('case 4a / 4b: each draft considers the binder copy', () => {
    expect(countsOf(plan('4a'), IDS.zuko)).toEqual(counts(5, 2, 3, 0));

    const draftOnly = plan('4b');
    expect(countsOf(draftOnly, IDS.draft)).toEqual(counts(1, 0, 1, 0));
    expect(allocationsOf(draftOnly, IDS.draftSolRing)).toEqual([loose(1, IDS.binder, AVATAR)]);
  });

  it('case 4c: building both gives one shortage', () => {
    const result = plan('4c');

    expect(result.decks.map((d) => d.deckId)).toEqual([IDS.zuko, IDS.draft]);
    expect(countsOf(result, IDS.zuko)).toEqual(counts(5, 2, 3, 0));
    expect(countsOf(result, IDS.draft)).toEqual(counts(1, 0, 0, 1));
    expect(result.totals).toEqual(counts(6, 2, 3, 1));
  });

  it('case 4d: a choice flips who gets the copy', () => {
    const result = plan('4d');

    expect(countsOf(result, IDS.zuko)).toEqual(counts(5, 2, 2, 1));
    expect(countsOf(result, IDS.draft)).toEqual(counts(1, 0, 1, 0));
  });

  it('case 4e: unprotected, both drafts are filled', () => {
    const result = plan('4e');

    expect(allocationsOf(result, IDS.zukoSolRing)).toEqual([loose(1, IDS.binder, AVATAR)]);
    expect(allocationsOf(result, IDS.draftSolRing)).toEqual([
      borrowed(1, IDS.hydrasBox, CMM, IDS.hydras),
    ]);
    expect(result.totals).toEqual(counts(6, 2, 4, 0));
  });

  it('echoes the snapshot revision', () => {
    const { snapshot, choices } = planningCase('1');
    expect(planBuild({ ...snapshot, revision: 42 }, choices).revision).toBe(42);
  });
});

describe('planBuild: allocation rules', () => {
  it('exact demand beats flexible by default', () => {
    const byDefault = plan('exact beats flexible');
    expect(countsOf(byDefault, IDS.zuko)).toEqual(counts(1, 0, 1, 0));
    expect(countsOf(byDefault, IDS.draft)).toEqual(counts(1, 0, 0, 1));

    const draftFirst = plan('exact beats flexible, draft first');
    expect(countsOf(draftFirst, IDS.draft)).toEqual(counts(1, 0, 1, 0));
    expect(countsOf(draftFirst, IDS.zuko)).toEqual(counts(1, 0, 0, 1));
  });

  it('maybeboard never reserves', () => {
    expect(allocationsOf(plan('maybeboard never reserves'), 'entry-draft')).toEqual([
      surplus(1, IDS.zukoBox, AVATAR, IDS.zuko),
    ]);
  });

  it('a protected box lends its surplus', () => {
    const result = plan('protected surplus');
    expect(countsOf(result, IDS.zuko)).toEqual(counts(1, 0, 1, 0));
    expect(allocationsOf(result, 'entry-zuko')).toEqual([
      surplus(1, IDS.hydrasBox, CMM, IDS.hydras),
    ]);
  });

  it('loose stock comes before a soft reservation', () => {
    expect(allocationsOf(plan('3a unprotected'), IDS.zukoSolRing)).toEqual([
      loose(1, IDS.binder, AVATAR),
    ]);
  });

  it('a protected deck reserves only in its own box', () => {
    expect(allocationsOf(plan('protected own box only'), 'entry-zuko')).toEqual([
      loose(1, IDS.binder, CMM),
    ]);
  });

  it('flexible reservations avoid a printing a target needs exactly', () => {
    expect(allocationsOf(plan('tie-break'), 'entry-zuko')).toEqual([
      surplus(1, IDS.hydrasBox, CMM, IDS.hydras),
    ]);
  });

  it('an exact finish must match', () => {
    expect(countsOf(plan('exact finish, only nonfoil'), IDS.zuko)).toEqual(counts(1, 0, 0, 1));
    expect(allocationsOf(plan('exact finish, foil owned'), 'entry-zuko')).toEqual([
      loose(1, IDS.binder, CMM, 'foil'),
    ]);
  });

  it('one row splits into surplus and borrowed', () => {
    const result = plan('split row');
    expect(countsOf(result, IDS.zuko)).toEqual(counts(2, 0, 2, 0));
    expect(allocationsOf(result, 'entry-zuko')).toEqual([
      surplus(1, IDS.hydrasBox, CMM, IDS.hydras),
      borrowed(1, IDS.hydrasBox, CMM, IDS.hydras),
    ]);
  });

  it('a choice naming a non-target is ignored', () => {
    expect(plan('non-target choice')).toEqual(plan('4c'));
  });

  it('an empty target and a Maybeboard-only target count zero', () => {
    const result = plan('empty targets');
    expect(countsOf(result, 'deck-empty')).toEqual(counts(0, 0, 0, 0));
    expect(countsOf(result, 'deck-ideas')).toEqual(counts(0, 0, 0, 0));
    expect(entryOf(result, 'entry-idea').allocations).toEqual([]);
    expect(result.totals).toEqual(counts(0, 0, 0, 0));
  });

  it('one card in two sections sums its demand', () => {
    expect(countsOf(plan('two sections'), IDS.zuko)).toEqual(counts(2, 0, 1, 1));
  });

  it('an unowned exact printing stays short', () => {
    const result = plan('unowned exact');
    expect(countsOf(result, IDS.zuko)).toEqual(counts(1, 0, 0, 1));
    expect(statuses(result, 'entry-zuko')).toEqual([['toAcquire', 1]]);
  });

  it('a repeated card choice serves the first target named', () => {
    expect(plan('repeated choice')).toEqual(plan('4d'));
  });

  it('a choice never spends the printing an exact entry needs when a spare copy exists', () => {
    const result = plan('choice spares the exact printing');
    expect(allocationsOf(result, 'entry-a')).toEqual([
      surplus(1, IDS.hydrasBox, AVATAR, IDS.hydras),
    ]);
    expect(allocationsOf(result, 'entry-b')).toEqual([loose(1, IDS.binder, CMM)]);
    expect(result.totals).toEqual(counts(2, 0, 2, 0));
  });

  it('known limit: a target keeps its in-box copy instead of swapping', () => {
    const result = plan('keep without swap');
    expect(countsOf(result, 'deck-b')).toEqual(counts(1, 1, 0, 0));
    expect(countsOf(result, 'deck-a')).toEqual(counts(1, 0, 0, 1));
  });

  it('two entries of one deck can draw from the same row', () => {
    const result = plan('two entries, one row');
    expect(countsOf(result, IDS.zuko)).toEqual(counts(2, 0, 2, 0));
    expect(allocationsOf(result, 'entry-main')).toEqual([loose(1, IDS.binder, CMM)]);
    expect(allocationsOf(result, 'entry-side')).toEqual([loose(1, IDS.binder, CMM)]);
  });

  it('an exact printing with no finish named accepts any finish', () => {
    expect(allocationsOf(plan('exact printing, any finish'), 'entry-zuko')).toEqual([
      loose(1, IDS.binder, CMM, 'foil'),
    ]);
  });

  it('applies a choice only to its own card', () => {
    const { snapshot } = planningCase('4c');
    const otherCard = planBuild(snapshot, {
      priority: [{ oracleId: CARDS.mountain, deckId: IDS.draft }],
    });
    expect(otherCard).toEqual(plan('4c'));
  });
});
