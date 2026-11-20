import type { BuildSnapshot, ExactPrinting, StockRow } from '../types';

export const CARDS = {
  solRing: '6ad8011d-3471-4369-9d68-b264cc027487',
  mountain: 'a3fb7228-e76b-4e96-a40e-20b5fed75685',
} as const;

export const PRINTINGS = {
  solRingAvatar: 'c1f93f78-645b-4f21-a80b-5542f3328111',
  solRingCommanderMasters: '46ca0b66-a000-4483-b916-f5b89e710244',
  mountain: 'c44f81ca-f72f-445c-8901-3a894a2a47f9',
} as const;

export const IDS = {
  zuko: 'deck-zuko',
  hydras: 'deck-hydras',
  draft: 'deck-draft',
  zukoBox: 'loc-zuko-box',
  hydrasBox: 'loc-hydras-box',
  binder: 'loc-binder',
  zukoSolRing: 'entry-zuko-sol-ring',
  zukoMountain: 'entry-zuko-mountain',
  zukoMaybeSolRing: 'entry-zuko-maybe-sol-ring',
  hydrasSolRing: 'entry-hydras-sol-ring',
  draftSolRing: 'entry-draft-sol-ring',
} as const;

export interface WalkthroughOptions {
  readonly targets?: readonly string[];
  readonly protectedIds?: readonly string[];
  readonly avatarSolRingInBinder?: boolean;
  readonly zukoSolRing?: ExactPrinting | null;
}

export function walkthroughSnapshot(options: WalkthroughOptions = {}): BuildSnapshot {
  const stock: StockRow[] = [
    {
      printingId: PRINTINGS.mountain,
      oracleId: CARDS.mountain,
      finish: 'nonfoil',
      locationId: IDS.zukoBox,
      quantity: 2,
    },
    {
      printingId: PRINTINGS.mountain,
      oracleId: CARDS.mountain,
      finish: 'nonfoil',
      locationId: IDS.binder,
      quantity: 2,
    },
    {
      printingId: PRINTINGS.solRingCommanderMasters,
      oracleId: CARDS.solRing,
      finish: 'nonfoil',
      locationId: IDS.hydrasBox,
      quantity: 1,
    },
  ];
  if (options.avatarSolRingInBinder === true) {
    stock.push({
      printingId: PRINTINGS.solRingAvatar,
      oracleId: CARDS.solRing,
      finish: 'nonfoil',
      locationId: IDS.binder,
      quantity: 1,
    });
  }

  return {
    revision: 1,
    targetDeckIds: options.targets ?? [IDS.zuko],
    protectedDeckIds: options.protectedIds ?? [IDS.hydras],
    locations: [{ id: IDS.zukoBox }, { id: IDS.hydrasBox }, { id: IDS.binder }],
    decks: [
      {
        id: IDS.zuko,
        boxLocationId: IDS.zukoBox,
        entries: [
          {
            id: IDS.zukoSolRing,
            oracleId: CARDS.solRing,
            section: 'main',
            quantity: 1,
            printing: options.zukoSolRing ?? null,
          },
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
        ],
      },
      {
        id: IDS.hydras,
        boxLocationId: IDS.hydrasBox,
        entries: [
          {
            id: IDS.hydrasSolRing,
            oracleId: CARDS.solRing,
            section: 'main',
            quantity: 1,
            printing: null,
          },
        ],
      },
      {
        id: IDS.draft,
        boxLocationId: null,
        entries: [
          {
            id: IDS.draftSolRing,
            oracleId: CARDS.solRing,
            section: 'main',
            quantity: 1,
            printing: null,
          },
        ],
      },
    ],
    stock,
  };
}
