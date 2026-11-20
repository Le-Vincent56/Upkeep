import { allocate } from './allocate';
import { assemblePlan } from './assemblePlan';
import type { PlanBuild } from './types';
import { validateSnapshot } from './validateSnapshot';

/** The one way to compute readiness: validate the snapshot, allocate, then explain. */
export const planBuild: PlanBuild = (snapshot, choices) => {
  validateSnapshot(snapshot);
  return assemblePlan(snapshot, allocate(snapshot, choices));
};
