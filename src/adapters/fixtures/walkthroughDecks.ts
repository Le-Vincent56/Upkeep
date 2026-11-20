import type { DeckDetail, DeckSummary, LocationName } from '../../features/deckDetail/contracts';
import { IDS } from '../../planning/fixtures/zukoHydras';

export const HEADER_ART = {
  fireLordZuko: 'e62d3bcc-7bb4-42be-90a9-caf3c1caa29d',
  polukranos: '47f7d313-8333-41fe-8bfa-c96774dac228',
} as const;

const DECKS: readonly DeckSummary[] = [
  { id: IDS.zuko, name: 'Zuko Spellslinger', hasBox: true },
  { id: IDS.hydras, name: 'Hydras', hasBox: true },
  { id: IDS.draft, name: 'Sol Ring Draft', hasBox: false },
];

const LOCATIONS: readonly LocationName[] = [
  { id: IDS.zukoBox, name: 'Zuko box' },
  { id: IDS.hydrasBox, name: 'Hydras box' },
  { id: IDS.binder, name: 'Binder' },
];

export const ZUKO_DETAIL: DeckDetail = {
  id: IDS.zuko,
  name: 'Zuko Spellslinger',
  format: 'commander',
  colors: ['B', 'R', 'W'],
  gamePlan:
    'Cast spells from exile to put +1/+1 counters on the whole team, then attack with Zuko and spend the firebending mana before combat ends. Sol Ring and a stack of Mountains get there a turn early.',
  headerArtPrintingId: HEADER_ART.fireLordZuko,
  decks: DECKS,
  locations: LOCATIONS,
};

export const HYDRAS_DETAIL: DeckDetail = {
  id: IDS.hydras,
  name: 'Hydras',
  format: 'commander',
  colors: ['G', 'W'],
  gamePlan:
    'Ramp into Polukranos, let every Hydra that dies come back as two more, and win with a board that gains life as it grows.',
  headerArtPrintingId: HEADER_ART.polukranos,
  decks: DECKS,
  locations: LOCATIONS,
};

export const DRAFT_DETAIL: DeckDetail = {
  id: IDS.draft,
  name: 'Sol Ring Draft',
  format: 'custom',
  colors: [],
  gamePlan: 'A test list for trying Sol Ring in a new shell before it earns a box.',
  headerArtPrintingId: null,
  decks: DECKS,
  locations: LOCATIONS,
};

export const WALKTHROUGH_DECK_DETAILS: Readonly<Record<string, DeckDetail>> = {
  [IDS.zuko]: ZUKO_DETAIL,
  [IDS.hydras]: HYDRAS_DETAIL,
  [IDS.draft]: DRAFT_DETAIL,
};

export const WALKTHROUGH_START_DECK_ID: string = IDS.zuko;
