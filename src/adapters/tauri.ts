import { invoke } from '@tauri-apps/api/core';
import type { AppDependencies } from '../app/dependencies';
import type { RuntimeInfo } from '../app/runtimeInfo';
import { seedIndex } from '../catalog/seedCatalog';
import { createFixtureDeckReaders } from './fixture';
import { WALKTHROUGH_START_DECK_ID } from './fixtures/walkthroughDecks';

export function createTauriDependencies(): AppDependencies {
  return {
    runtimeInfo: {
      loadRuntimeInfo: () => invoke<RuntimeInfo>('get_runtime_info'),
    },
    catalog: seedIndex,
    // The desktop serves fixture decks until SQLite arrives
    ...createFixtureDeckReaders(),
    startDeckId: WALKTHROUGH_START_DECK_ID,
  };
}
