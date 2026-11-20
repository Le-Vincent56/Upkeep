import { describe, expect, it } from 'vitest';
import { seedIndex } from '../../catalog/seedCatalog';
import { IDS, walkthroughSnapshot } from '../../planning/fixtures/zukoHydras';
import {
  DRAFT_DETAIL,
  HYDRAS_DETAIL,
  WALKTHROUGH_DECK_DETAILS,
  WALKTHROUGH_START_DECK_ID,
  ZUKO_DETAIL,
} from './walkthroughDecks';

const ALL_DETAILS = [ZUKO_DETAIL, HYDRAS_DETAIL, DRAFT_DETAIL];

describe('walkthrough deck details', () => {
  it('has a record for every walkthrough deck, keyed by its own id', () => {
    expect(Object.keys(WALKTHROUGH_DECK_DETAILS).sort()).toEqual(
      [IDS.zuko, IDS.hydras, IDS.draft].sort(),
    );
    for (const [id, detail] of Object.entries(WALKTHROUGH_DECK_DETAILS)) {
      expect(detail.id).toBe(id);
    }
  });

  it('names every deck and location in the walkthrough snapshot', () => {
    const snapshot = walkthroughSnapshot();
    for (const detail of ALL_DETAILS) {
      expect(detail.decks.map((deck) => deck.id)).toEqual(snapshot.decks.map((deck) => deck.id));
      expect(detail.locations.map((location) => location.id)).toEqual(
        snapshot.locations.map((location) => location.id),
      );
      for (const deck of detail.decks) {
        const snapshotDeck = snapshot.decks.find((candidate) => candidate.id === deck.id);
        expect(deck.hasBox).toBe(snapshotDeck?.boxLocationId !== null);
      }
    }
  });

  it('points header art at seeded printings', () => {
    expect(seedIndex.printingById(ZUKO_DETAIL.headerArtPrintingId ?? '')).toMatchObject({
      setCode: 'tla',
      collectorNumber: '221',
    });
    expect(seedIndex.printingById(HYDRAS_DETAIL.headerArtPrintingId ?? '')).toMatchObject({
      setCode: 'mom',
      collectorNumber: '200',
    });
    expect(DRAFT_DETAIL.headerArtPrintingId).toBeNull();
  });

  it('starts on Zuko', () => {
    expect(WALKTHROUGH_START_DECK_ID).toBe(IDS.zuko);
  });
});
