import { CARDS, IDS, PRINTINGS, walkthroughSnapshot } from './fixtures/zukoHydras';
import { deck, entry, exact, snapshot, stock } from './testSnapshot';
import type { AllocationChoices, BuildSnapshot } from './types';

export interface PlanningCase {
  readonly snapshot: BuildSnapshot;
  readonly choices: AllocationChoices;
}

const SOL = CARDS.solRing;
const AVATAR = PRINTINGS.solRingAvatar;
const CMM = PRINTINGS.solRingCommanderMasters;

export const NO_CHOICES: AllocationChoices = { priority: [] };
export const DRAFT_FIRST: AllocationChoices = { priority: [{ oracleId: SOL, deckId: IDS.draft }] };

const BOTH_DRAFTS = { avatarSolRingInBinder: true, targets: [IDS.zuko, IDS.draft] } as const;

const CASES = {
  '1': () => ({ snapshot: walkthroughSnapshot(), choices: NO_CHOICES }),
  '2': () => ({ snapshot: walkthroughSnapshot({ protectedIds: [] }), choices: NO_CHOICES }),
  '3a': () => ({
    snapshot: walkthroughSnapshot({ avatarSolRingInBinder: true }),
    choices: NO_CHOICES,
  }),
  '3a unprotected': () => ({
    snapshot: walkthroughSnapshot({ avatarSolRingInBinder: true, protectedIds: [] }),
    choices: NO_CHOICES,
  }),
  '3b': () => ({
    snapshot: walkthroughSnapshot({ avatarSolRingInBinder: true, zukoSolRing: exact(CMM) }),
    choices: NO_CHOICES,
  }),
  '4a': () => ({
    snapshot: walkthroughSnapshot({ avatarSolRingInBinder: true, targets: [IDS.zuko] }),
    choices: NO_CHOICES,
  }),
  '4b': () => ({
    snapshot: walkthroughSnapshot({ avatarSolRingInBinder: true, targets: [IDS.draft] }),
    choices: NO_CHOICES,
  }),
  '4c': () => ({ snapshot: walkthroughSnapshot(BOTH_DRAFTS), choices: NO_CHOICES }),
  '4d': () => ({ snapshot: walkthroughSnapshot(BOTH_DRAFTS), choices: DRAFT_FIRST }),
  '4e': () => ({
    snapshot: walkthroughSnapshot({ ...BOTH_DRAFTS, protectedIds: [] }),
    choices: NO_CHOICES,
  }),
  'non-target choice': () => ({
    snapshot: walkthroughSnapshot(BOTH_DRAFTS),
    choices: { priority: [{ oracleId: SOL, deckId: IDS.hydras }] },
  }),
  'repeated choice': () => ({
    snapshot: walkthroughSnapshot(BOTH_DRAFTS),
    choices: {
      priority: [
        { oracleId: SOL, deckId: IDS.draft },
        { oracleId: SOL, deckId: IDS.zuko },
      ],
    },
  }),
  'exact beats flexible': () => ({ snapshot: exactVersusFlexible(), choices: NO_CHOICES }),
  'exact beats flexible, draft first': () => ({
    snapshot: exactVersusFlexible(),
    choices: DRAFT_FIRST,
  }),
  'maybeboard never reserves': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.draft],
      decks: [
        deck(IDS.zuko, IDS.zukoBox, [
          entry('entry-maybe', SOL, 1, { section: 'maybeboard', printing: exact(AVATAR) }),
        ]),
        deck(IDS.draft, null, [entry('entry-draft', SOL, 1)]),
      ],
      stock: [stock(AVATAR, SOL, IDS.zukoBox, 1)],
    }),
    choices: NO_CHOICES,
  }),
  'protected surplus': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      protectedDeckIds: [IDS.hydras],
      decks: [
        deck(IDS.hydras, IDS.hydrasBox, [entry('entry-hydras', SOL, 1)]),
        deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 1)]),
      ],
      stock: [stock(CMM, SOL, IDS.hydrasBox, 2)],
    }),
    choices: NO_CHOICES,
  }),
  'protected own box only': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      protectedDeckIds: [IDS.hydras],
      decks: [
        deck(IDS.hydras, IDS.hydrasBox, [entry('entry-hydras', SOL, 1)]),
        deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 1)]),
      ],
      stock: [stock(CMM, SOL, IDS.binder, 1)],
    }),
    choices: NO_CHOICES,
  }),
  'tie-break': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      protectedDeckIds: [IDS.hydras],
      decks: [
        deck(IDS.hydras, IDS.hydrasBox, [entry('entry-hydras', SOL, 1)]),
        deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 1, { printing: exact(CMM) })]),
      ],
      stock: [stock(AVATAR, SOL, IDS.hydrasBox, 1), stock(CMM, SOL, IDS.hydrasBox, 1)],
    }),
    choices: NO_CHOICES,
  }),
  'exact finish, only nonfoil': () => ({ snapshot: foilWanted(false), choices: NO_CHOICES }),
  'exact finish, foil owned': () => ({ snapshot: foilWanted(true), choices: NO_CHOICES }),
  'split row': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      decks: [
        deck(IDS.hydras, IDS.hydrasBox, [entry('entry-hydras', SOL, 1)]),
        deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 2)]),
      ],
      stock: [stock(CMM, SOL, IDS.hydrasBox, 2)],
    }),
    choices: NO_CHOICES,
  }),
  'empty targets': () => ({
    snapshot: snapshot({
      targetDeckIds: ['deck-empty', 'deck-ideas'],
      decks: [
        deck('deck-empty', null, []),
        deck('deck-ideas', null, [entry('entry-idea', SOL, 1, { section: 'maybeboard' })]),
      ],
      stock: [stock(CMM, SOL, IDS.binder, 1)],
    }),
    choices: NO_CHOICES,
  }),
  'two sections': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      decks: [
        deck(IDS.zuko, IDS.zukoBox, [
          entry('entry-main', SOL, 1),
          entry('entry-side', SOL, 1, { section: 'sideboard' }),
        ]),
      ],
      stock: [stock(AVATAR, SOL, IDS.binder, 1)],
    }),
    choices: NO_CHOICES,
  }),
  'unowned exact': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      decks: [
        deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 1, { printing: exact(AVATAR) })]),
      ],
      stock: [stock(CMM, SOL, IDS.binder, 1)],
    }),
    choices: NO_CHOICES,
  }),
  'same deck': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      decks: [
        deck(IDS.zuko, IDS.zukoBox, [
          entry('entry-exact', SOL, 1, { printing: exact(AVATAR) }),
          entry('entry-flex', SOL, 1),
        ]),
      ],
      stock: [stock(AVATAR, SOL, IDS.binder, 1)],
    }),
    choices: NO_CHOICES,
  }),
  'target keep blocks': () => ({
    snapshot: snapshot({
      targetDeckIds: ['deck-a', 'deck-b'],
      decks: [
        deck('deck-a', 'loc-a-box', [entry('entry-a', SOL, 1)]),
        deck('deck-b', null, [entry('entry-b', SOL, 1)]),
      ],
      stock: [stock(CMM, SOL, 'loc-a-box', 1)],
    }),
    choices: NO_CHOICES,
  }),
  'unowned card': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      decks: [deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 1)])],
    }),
    choices: NO_CHOICES,
  }),
  'choice spares the exact printing': () => ({
    snapshot: snapshot({
      targetDeckIds: ['deck-a', 'deck-b'],
      protectedDeckIds: [IDS.hydras],
      decks: [
        deck('deck-a', null, [entry('entry-a', SOL, 1)]),
        deck('deck-b', null, [entry('entry-b', SOL, 1, { printing: exact(CMM) })]),
        deck(IDS.hydras, IDS.hydrasBox, [entry('entry-hydras', SOL, 1)]),
      ],
      stock: [stock(CMM, SOL, IDS.binder, 1), stock(AVATAR, SOL, IDS.hydrasBox, 2)],
    }),
    choices: { priority: [{ oracleId: SOL, deckId: 'deck-a' }] },
  }),
  'keep without swap': () => ({
    snapshot: snapshot({
      targetDeckIds: ['deck-a', 'deck-b'],
      decks: [
        deck('deck-a', null, [entry('entry-a', SOL, 1, { printing: exact(CMM) })]),
        deck('deck-b', 'loc-b-box', [entry('entry-b', SOL, 1)]),
      ],
      stock: [stock(CMM, SOL, 'loc-b-box', 1), stock(AVATAR, SOL, IDS.binder, 1)],
    }),
    choices: NO_CHOICES,
  }),
  'two entries, one row': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      decks: [
        deck(IDS.zuko, IDS.zukoBox, [
          entry('entry-main', SOL, 1),
          entry('entry-side', SOL, 1, { section: 'sideboard' }),
        ]),
      ],
      stock: [stock(CMM, SOL, IDS.binder, 2)],
    }),
    choices: NO_CHOICES,
  }),
  'exact printing, any finish': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      decks: [deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 1, { printing: exact(CMM) })])],
      stock: [stock(CMM, SOL, IDS.binder, 1, 'foil')],
    }),
    choices: NO_CHOICES,
  }),
  'same deck keep': () => ({
    snapshot: snapshot({
      targetDeckIds: [IDS.zuko],
      decks: [
        deck(IDS.zuko, IDS.zukoBox, [
          entry('entry-exact', SOL, 1, { printing: exact(AVATAR) }),
          entry('entry-flex', SOL, 1),
        ]),
      ],
      stock: [stock(AVATAR, SOL, IDS.zukoBox, 1)],
    }),
    choices: NO_CHOICES,
  }),
} satisfies Record<string, () => PlanningCase>;

export type CaseName = keyof typeof CASES;

export function planningCase(name: CaseName): PlanningCase {
  return CASES[name]();
}

export function allCases(): [CaseName, PlanningCase][] {
  return (Object.keys(CASES) as CaseName[]).map((name) => [name, planningCase(name)]);
}

function exactVersusFlexible(): BuildSnapshot {
  return snapshot({
    targetDeckIds: [IDS.draft, IDS.zuko],
    decks: [
      deck(IDS.draft, null, [entry('entry-draft', SOL, 1)]),
      deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 1, { printing: exact(AVATAR) })]),
    ],
    stock: [stock(AVATAR, SOL, IDS.binder, 1)],
  });
}

function foilWanted(foilOwned: boolean): BuildSnapshot {
  return snapshot({
    targetDeckIds: [IDS.zuko],
    decks: [
      deck(IDS.zuko, IDS.zukoBox, [entry('entry-zuko', SOL, 1, { printing: exact(CMM, 'foil') })]),
    ],
    stock: [
      stock(CMM, SOL, IDS.binder, 1),
      ...(foilOwned ? [stock(CMM, SOL, IDS.binder, 1, 'foil')] : []),
    ],
  });
}
