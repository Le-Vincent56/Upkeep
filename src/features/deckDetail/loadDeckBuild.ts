import type { CatalogIndex } from '../../catalog/catalogIndex';
import { planBuild } from '../../planning/planBuild';
import type { AllocationChoices, BuildPlan, PlannedDeck } from '../../planning/types';
import type { BuildSnapshotReader, DeckDetail, DeckDetailReader, DeckSummary } from './contracts';
import { buildDeckRows, type DeckRow } from './deckRows';

export interface DeckBuildReaders {
  readonly buildSnapshots: BuildSnapshotReader;
  readonly deckDetails: DeckDetailReader;
  readonly catalog: CatalogIndex;
}

export interface DeckBuild {
  readonly detail: DeckDetail;
  readonly plan: BuildPlan;
  readonly plannedDeck: PlannedDeck;
  readonly rows: readonly DeckRow[];
  readonly protectedDeckIds: readonly string[];
}

const NO_CHOICES: AllocationChoices = { priority: [] };

export function offeredDecks(detail: DeckDetail): DeckSummary[] {
  return detail.decks.filter((deck) => deck.hasBox && deck.id !== detail.id);
}

export function defaultProtectedIds(detail: DeckDetail): string[] {
  return offeredDecks(detail).map((deck) => deck.id);
}

async function planDeck(
  readers: DeckBuildReaders,
  detail: DeckDetail,
  protectedDeckIds: readonly string[],
): Promise<DeckBuild> {
  const snapshot = await readers.buildSnapshots.loadBuildSnapshot({
    targetDeckIds: [detail.id],
    protectedDeckIds,
  });
  const plan = planBuild(snapshot, NO_CHOICES);
  const plannedDeck = plan.decks[0];
  if (plannedDeck === undefined) throw new Error(`The plan has no result for deck ${detail.id}`);

  const rows = buildDeckRows(plannedDeck, snapshot, readers.catalog);
  return { detail, plan, plannedDeck, rows, protectedDeckIds };
}

export async function loadDeckBuild(readers: DeckBuildReaders, deckId: string): Promise<DeckBuild> {
  const detail = await readers.deckDetails.loadDeckDetail(deckId);
  return planDeck(readers, detail, defaultProtectedIds(detail));
}

export function replanDeckBuild(
  readers: DeckBuildReaders,
  build: DeckBuild,
  protectedDeckIds: readonly string[],
): Promise<DeckBuild> {
  return planDeck(readers, build.detail, protectedDeckIds);
}
