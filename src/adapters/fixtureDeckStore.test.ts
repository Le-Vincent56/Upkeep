import { describe, expect, it } from 'vitest';
import { seedIndex } from '../catalog/seedCatalog';
import { DeckEditError } from '../decks/edits';
import type { DeckEntry } from '../decks/types';
import type { BuildSelection } from '../features/deckDetail/contracts';
import { IDS, walkthroughSnapshot } from '../planning/fixtures/zukoHydras';
import { planBuild } from '../planning/planBuild';
import type { BuildSnapshot } from '../planning/types';
import { createFixtureDeckStore } from './fixtureDeckStore';

const SELECTION: BuildSelection = { targetDeckIds: [IDS.zuko], protectedDeckIds: [IDS.hydras] };

function zukoEntries(snapshot: BuildSnapshot): readonly DeckEntry[] {
  const zuko = snapshot.decks.find((deck) => deck.id === IDS.zuko);
  if (zuko === undefined) throw new Error('The snapshot has no Zuko deck');

  return zuko.entries;
}

function mountainOf(snapshot: BuildSnapshot): DeckEntry {
  const mountain = zukoEntries(snapshot).find((entry) => entry.id === IDS.zukoMountain);
  if (mountain === undefined) throw new Error('Zuko has no Mountain entry');

  return mountain;
}

describe('createFixtureDeckStore', () => {
  it('starts as the walkthrough', async () => {
    const store = createFixtureDeckStore(seedIndex);

    await expect(
      store.buildSnapshots.loadBuildSnapshot({ targetDeckIds: [IDS.zuko], protectedDeckIds: [] }),
    ).resolves.toEqual(walkthroughSnapshot({ targets: [IDS.zuko], protectedIds: [] }));
  });

  it('shows an edit in the next snapshot and raises the revision', async () => {
    const store = createFixtureDeckStore(seedIndex);
    await store.deckWriter.editDeck(IDS.zuko, {
      kind: 'setQuantity',
      entryId: IDS.zukoMountain,
      quantity: 6,
    });

    const snapshot = await store.buildSnapshots.loadBuildSnapshot(SELECTION);
    expect(mountainOf(snapshot).quantity).toBe(6);
    expect(snapshot.revision).toBe(2);
  });

  it('keeps the revision for an edit that changes nothing', async () => {
    const store = createFixtureDeckStore(seedIndex);
    await store.deckWriter.editDeck(IDS.zuko, {
      kind: 'setQuantity',
      entryId: IDS.zukoMountain,
      quantity: 4,
    });

    expect((await store.buildSnapshots.loadBuildSnapshot(SELECTION)).revision).toBe(1);
  });

  it('rejects an invalid edit and changes nothing', async () => {
    const store = createFixtureDeckStore(seedIndex);
    const before = await store.buildSnapshots.loadBuildSnapshot(SELECTION);

    await expect(
      store.deckWriter.editDeck(IDS.zuko, {
        kind: 'setQuantity',
        entryId: IDS.zukoMountain,
        quantity: 0,
      }),
    ).rejects.toBeInstanceOf(DeckEditError);
    await expect(store.buildSnapshots.loadBuildSnapshot(SELECTION)).resolves.toEqual(before);
  });

  it('never changes stock', async () => {
    const store = createFixtureDeckStore(seedIndex);
    const before = (await store.buildSnapshots.loadBuildSnapshot(SELECTION)).stock;

    await store.deckWriter.editDeck(IDS.zuko, {
      kind: 'setQuantity',
      entryId: IDS.zukoMountain,
      quantity: 9,
    });
    await store.deckWriter.editDeck(IDS.zuko, { kind: 'removeEntry', entryId: IDS.zukoSolRing });
    await store.deckWriter.editDeck(IDS.hydras, {
      kind: 'setSection',
      entryId: IDS.hydrasSolRing,
      section: 'sideboard',
    });

    expect((await store.buildSnapshots.loadBuildSnapshot(SELECTION)).stock).toEqual(before);
  });

  it('never changes a snapshot it already returned', async () => {
    const store = createFixtureDeckStore(seedIndex);
    const earlier = await store.buildSnapshots.loadBuildSnapshot(SELECTION);
    const copy = structuredClone(earlier);

    await store.deckWriter.editDeck(IDS.zuko, {
      kind: 'setQuantity',
      entryId: IDS.zukoMountain,
      quantity: 6,
    });
    await store.deckWriter.editDeck(IDS.zuko, { kind: 'removeEntry', entryId: IDS.zukoSolRing });

    expect(earlier).toEqual(copy);
  });

  it('puts a removed entry back where it was, with the same plan', async () => {
    const store = createFixtureDeckStore(seedIndex);
    const before = await store.buildSnapshots.loadBuildSnapshot(SELECTION);
    const mountain = mountainOf(before);

    await store.deckWriter.editDeck(IDS.zuko, { kind: 'removeEntry', entryId: IDS.zukoMountain });
    await store.deckWriter.editDeck(IDS.zuko, { kind: 'addEntry', entry: mountain, at: 1 });

    const after = await store.buildSnapshots.loadBuildSnapshot(SELECTION);
    expect(zukoEntries(after)).toEqual(zukoEntries(before));
    expect(planBuild(after, { priority: [] }).decks).toEqual(
      planBuild(before, { priority: [] }).decks,
    );
  });

  it('gives each store its own decks', async () => {
    const first = createFixtureDeckStore(seedIndex);
    const second = createFixtureDeckStore(seedIndex);

    await first.deckWriter.editDeck(IDS.zuko, {
      kind: 'setQuantity',
      entryId: IDS.zukoMountain,
      quantity: 6,
    });

    expect(mountainOf(await second.buildSnapshots.loadBuildSnapshot(SELECTION)).quantity).toBe(4);
  });

  it('rejects an edit of an unknown deck', async () => {
    const store = createFixtureDeckStore(seedIndex);

    await expect(
      store.deckWriter.editDeck('deck-missing', { kind: 'removeEntry', entryId: IDS.zukoMountain }),
    ).rejects.toThrow('deck-missing');
  });
});
