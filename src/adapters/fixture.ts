import type { AppDependencies } from '../app/dependencies';
import { seedIndex } from '../catalog/seedCatalog';
import { createFixtureDeckStore } from './fixtureDeckStore';
import { WALKTHROUGH_START_DECK_ID } from './fixtures/walkthroughDecks';

export const FIXTURE_VERSION = '0.1.0';

export function createFixtureDependencies(): AppDependencies {
  return {
    runtimeInfo: {
      loadRuntimeInfo: async () => ({ adapter: 'fixture', version: FIXTURE_VERSION }),
    },
    catalog: seedIndex,
    ...createFixtureDeckStore(seedIndex),
    startDeckId: WALKTHROUGH_START_DECK_ID,
  };
}
