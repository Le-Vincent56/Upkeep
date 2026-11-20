import { describe, expect, it } from 'vitest';
import { CARDS, IDS, PRINTINGS } from './fixtures/zukoHydras';
import { planBuild } from './planBuild';
import { planningCase, type CaseName } from './planningCases';
import type { Block, BuildPlan, Move } from './types';

const SOL = CARDS.solRing;
const AVATAR = PRINTINGS.solRingAvatar;
const CMM = PRINTINGS.solRingCommanderMasters;

function plan(name: CaseName): BuildPlan {
  const { snapshot, choices } = planningCase(name);
  return planBuild(snapshot, choices);
}

function blockedBy(result: BuildPlan, entryId: string): readonly Block[] {
  const found = result.decks.flatMap((d) => d.entries).find((e) => e.entryId === entryId);
  const acquire = found?.allocations.find((a) => a.status === 'toAcquire');
  if (acquire === undefined || acquire.status !== 'toAcquire') {
    throw new Error(`entry ${entryId} has nothing to acquire`);
  }
  return acquire.blockedBy;
}

function move(overrides: Partial<Move> & Pick<Move, 'printingId' | 'fromLocationId'>): Move {
  return {
    finish: 'nonfoil',
    toDeckId: IDS.zuko,
    toLocationId: IDS.zukoBox,
    quantity: 1,
    leavesShortDeckId: null,
    ...overrides,
  };
}

describe('assemblePlan: checklist, buy list, reasons, conflicts', () => {
  it('case 1: one move and a Sol Ring to buy', () => {
    const result = plan('1');

    expect(result.moves).toEqual([
      move({ printingId: PRINTINGS.mountain, fromLocationId: IDS.binder, quantity: 2 }),
    ]);
    expect(result.buyList).toEqual([
      { oracleId: SOL, printingId: null, finish: null, quantity: 1, deckIds: [IDS.zuko] },
    ]);
    expect(blockedBy(result, IDS.zukoSolRing)).toEqual([
      { kind: 'protected', deckId: IDS.hydras, quantity: 1 },
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it('case 2: the Sol Ring move leaves Hydras short', () => {
    const result = plan('2');

    expect(result.moves).toEqual([
      move({ printingId: PRINTINGS.mountain, fromLocationId: IDS.binder, quantity: 2 }),
      move({ printingId: CMM, fromLocationId: IDS.hydrasBox, leavesShortDeckId: IDS.hydras }),
    ]);
    expect(result.buyList).toEqual([]);
  });

  it('case 3b: the buy list names the exact printing', () => {
    const result = plan('3b');

    expect(result.buyList).toEqual([
      { oracleId: SOL, printingId: CMM, finish: null, quantity: 1, deckIds: [IDS.zuko] },
    ]);
    expect(blockedBy(result, IDS.zukoSolRing)).toEqual([
      { kind: 'protected', deckId: IDS.hydras, quantity: 1 },
    ]);
  });

  it('case 4b: a target without a box moves to null', () => {
    expect(plan('4b').moves).toEqual([
      move({
        printingId: AVATAR,
        fromLocationId: IDS.binder,
        toDeckId: IDS.draft,
        toLocationId: null,
      }),
    ]);
  });

  it('case 4c: the conflict and both reasons are named', () => {
    const result = plan('4c');

    expect(result.conflicts).toEqual([
      { oracleId: SOL, shortDeckIds: [IDS.draft], takenByDeckIds: [IDS.zuko] },
    ]);
    expect(blockedBy(result, IDS.draftSolRing)).toEqual([
      { kind: 'protected', deckId: IDS.hydras, quantity: 1 },
      { kind: 'otherTarget', deckId: IDS.zuko, quantity: 1 },
    ]);
    expect(result.buyList).toEqual([
      { oracleId: SOL, printingId: null, finish: null, quantity: 1, deckIds: [IDS.draft] },
    ]);
  });

  it('case 4d: the choice flips the conflict', () => {
    expect(plan('4d').conflicts).toEqual([
      { oracleId: SOL, shortDeckIds: [IDS.zuko], takenByDeckIds: [IDS.draft] },
    ]);
  });

  it('case 4e: no conflict when nobody is short', () => {
    const result = plan('4e');
    expect(result.conflicts).toEqual([]);
    expect(result.buyList).toEqual([]);
  });

  it('orders moves by source location, then card', () => {
    const moves = plan('3a').moves;
    expect(moves.map((m) => [m.fromLocationId, m.printingId])).toEqual([
      [IDS.binder, AVATAR],
      [IDS.binder, PRINTINGS.mountain],
    ]);
  });

  it('split rows give two move lines', () => {
    expect(plan('split row').moves).toEqual([
      move({ printingId: CMM, fromLocationId: IDS.hydrasBox }),
      move({ printingId: CMM, fromLocationId: IDS.hydrasBox, leavesShortDeckId: IDS.hydras }),
    ]);
  });

  it('sameDeck names the deck itself', () => {
    expect(blockedBy(plan('same deck'), 'entry-flex')).toEqual([
      { kind: 'sameDeck', deckId: IDS.zuko, quantity: 1 },
    ]);
  });

  it("another target's box keep is a target block", () => {
    const result = plan('target keep blocks');
    expect(blockedBy(result, 'entry-b')).toEqual([
      { kind: 'target', deckId: 'deck-a', quantity: 1 },
    ]);
    expect(result.conflicts).toEqual([]);
  });

  it('sameDeck also names an in-box keep', () => {
    expect(blockedBy(plan('same deck keep'), 'entry-flex')).toEqual([
      { kind: 'sameDeck', deckId: IDS.zuko, quantity: 1 },
    ]);
  });

  it('exact beats flexible is reported as a conflict, and the choice flips it', () => {
    expect(plan('exact beats flexible').conflicts).toEqual([
      { oracleId: SOL, shortDeckIds: [IDS.draft], takenByDeckIds: [IDS.zuko] },
    ]);
    expect(plan('exact beats flexible, draft first').conflicts).toEqual([
      { oracleId: SOL, shortDeckIds: [IDS.zuko], takenByDeckIds: [IDS.draft] },
    ]);
  });

  it('a choice that spares the exact printing leaves nothing to buy or contest', () => {
    const result = plan('choice spares the exact printing');
    expect(result.conflicts).toEqual([]);
    expect(result.buyList).toEqual([]);
  });

  it('known limit: a kept copy blocks an exact need elsewhere without a conflict', () => {
    const result = plan('keep without swap');
    expect(blockedBy(result, 'entry-a')).toEqual([
      { kind: 'target', deckId: 'deck-b', quantity: 1 },
    ]);
    expect(result.conflicts).toEqual([]);
    expect(result.buyList).toEqual([
      { oracleId: SOL, printingId: CMM, finish: null, quantity: 1, deckIds: ['deck-a'] },
    ]);
  });

  it('two entries drawing from one row merge into one move line', () => {
    expect(plan('two entries, one row').moves).toEqual([
      move({ printingId: CMM, fromLocationId: IDS.binder, quantity: 2 }),
    ]);
  });

  it('an unowned card has no blocks', () => {
    const result = plan('unowned card');
    expect(blockedBy(result, 'entry-zuko')).toEqual([]);
    expect(result.buyList).toEqual([
      { oracleId: SOL, printingId: null, finish: null, quantity: 1, deckIds: [IDS.zuko] },
    ]);
  });

  it('an unowned exact printing leaves the other printing in place', () => {
    const result = plan('unowned exact');
    expect(result.moves).toEqual([]);
    expect(blockedBy(result, 'entry-zuko')).toEqual([]);
    expect(result.buyList).toEqual([
      { oracleId: SOL, printingId: AVATAR, finish: null, quantity: 1, deckIds: [IDS.zuko] },
    ]);
  });
});
