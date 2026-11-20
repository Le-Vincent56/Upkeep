import type { BuildSnapshot } from './types';

export class PlanningError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(['Invalid build snapshot:', ...problems.map((problem) => `- ${problem}`)].join('\n'));
    this.name = 'PlanningError';
    this.problems = problems;
  }
}

function duplicatesIn(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    else seen.add(id);
  }

  return [...duplicates];
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function validateSnapshot(snapshot: BuildSnapshot): void {
  const problems: string[] = [];
  const locationIds = new Set(snapshot.locations.map((location) => location.id));
  const decksById = new Map(snapshot.decks.map((deck) => [deck.id, deck] as const));
  const protectedIds = new Set(snapshot.protectedDeckIds);
  const entryIds = snapshot.decks.flatMap((deck) => deck.entries.map((entry) => entry.id));

  for (const id of duplicatesIn(snapshot.locations.map((location) => location.id))) {
    problems.push(`location ${id}: duplicate id`);
  }
  for (const id of duplicatesIn(snapshot.decks.map((deck) => deck.id))) {
    problems.push(`deck ${id}: duplicate id`);
  }
  for (const id of duplicatesIn(entryIds)) {
    problems.push(`entry ${id}: duplicate id`);
  }
  for (const id of duplicatesIn(snapshot.targetDeckIds)) {
    problems.push(`deck ${id}: duplicate target selection`);
  }
  for (const id of new Set(snapshot.targetDeckIds)) {
    if (!decksById.has(id)) problems.push(`deck ${id}: selected as target but unknown`);
    if (protectedIds.has(id)) problems.push(`deck ${id}: selected as both target and protected`);
  }
  for (const id of protectedIds) {
    const deck = decksById.get(id);
    if (deck === undefined) problems.push(`deck ${id}: selected as protected but unknown`);
    else if (deck.boxLocationId === null) problems.push(`deck ${id}: protected but has no box`);
  }

  const boxOwners = new Map<string, string>();
  for (const deck of snapshot.decks) {
    for (const entry of deck.entries) {
      if (isPositiveInteger(entry.quantity)) continue;
      problems.push(`entry ${entry.id}: quantity must be a positive integer`);
    }

    if (deck.boxLocationId === null) continue;

    if (!locationIds.has(deck.boxLocationId)) {
      problems.push(`deck ${deck.id}: box location ${deck.boxLocationId} is unknown`);
    }

    const owner = boxOwners.get(deck.boxLocationId);
    if (owner === undefined) boxOwners.set(deck.boxLocationId, deck.id);
    else
      problems.push(
        `location ${deck.boxLocationId}: box of both deck ${owner} and deck ${deck.id}`,
      );
  }

  const stockLabels = new Set<string>();
  for (const row of snapshot.stock) {
    const label = `stock ${row.printingId}/${row.finish}@${row.locationId}`;
    if (!locationIds.has(row.locationId)) problems.push(`${label}: location is unknown`);
    if (!isPositiveInteger(row.quantity))
      problems.push(`${label}: quantity must be a positive integer`);
    if (stockLabels.has(label)) problems.push(`${label}: duplicate row`);

    stockLabels.add(label);
  }

  if (problems.length > 0) throw new PlanningError(problems);
}
