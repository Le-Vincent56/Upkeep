import { createContext, useContext } from 'react';
import type { CatalogIndex } from '../catalog/catalogIndex';
import type { BuildSnapshotReader, DeckDetailReader } from '../features/deckDetail/contracts';
import type { RuntimeInfoReader } from './runtimeInfo';

export interface AppDependencies {
  runtimeInfo: RuntimeInfoReader;
  catalog: CatalogIndex;
  buildSnapshots: BuildSnapshotReader;
  deckDetails: DeckDetailReader;
  startDeckId: string;
}

export const DependenciesContext = createContext<AppDependencies | null>(null);

export function useDependencies(): AppDependencies {
  const dependencies = useContext(DependenciesContext);
  if (dependencies === null) {
    throw new Error('useDependencies must be used inside DependenciesContext');
  }

  return dependencies;
}
