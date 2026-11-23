import { invoke } from '@tauri-apps/api/core';
import type { AppDependencies } from '../app/dependencies';
import type { RuntimeInfo } from '../app/runtimeInfo';
import { seedIndex } from '../catalog/seedCatalog';
import { createFixtureDeckStore } from './fixtureDeckStore';
import { WALKTHROUGH_START_DECK_ID } from './fixtures/walkthroughDecks';

export function createTauriDependencies(): AppDependencies {
  return {
    runtimeInfo: {
      loadRuntimeInfo: () => invoke<RuntimeInfo>('get_runtime_info'),
    },
    catalog: seedIndex,
    // The desktop serves fixture decks until SQLite arrives
    ...createFixtureDeckStore(seedIndex),
    startDeckId: WALKTHROUGH_START_DECK_ID,
  };
}
