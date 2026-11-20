import type { AppDependencies } from '../app/dependencies';
import { seedIndex } from '../catalog/seedCatalog';
import { walkthroughSnapshot } from '../planning/fixtures/zukoHydras';
import { WALKTHROUGH_DECK_DETAILS, WALKTHROUGH_START_DECK_ID } from './fixtures/walkthroughDecks';

export const FIXTURE_VERSION = '0.1.0';

export function createFixtureDeckReaders(): Pick<
  AppDependencies,
  'buildSnapshots' | 'deckDetails'
> {
  return {
    buildSnapshots: {
      loadBuildSnapshot: async ({ targetDeckIds, protectedDeckIds }) =>
        walkthroughSnapshot({
          targets: targetDeckIds,
          protectedIds: protectedDeckIds,
        }),
    },
    deckDetails: {
      loadDeckDetail: async (deckId) => {
        const detail = WALKTHROUGH_DECK_DETAILS[deckId];
        if (detail === undefined) throw new Error(`No deck with id ${deckId}`);

        return detail;
      },
    },
  };
}

export function createFixtureDependencies(): AppDependencies {
  return {
    runtimeInfo: {
      loadRuntimeInfo: async () => ({ adapter: 'fixture', version: FIXTURE_VERSION }),
    },
    catalog: seedIndex,
    ...createFixtureDeckReaders(),
    startDeckId: WALKTHROUGH_START_DECK_ID,
  };
}
