import { createContext, useContext } from 'react';
import type { RuntimeInfoReader } from './runtimeInfo';

export interface AppDependencies {
  runtimeInfo: RuntimeInfoReader;
}

export const DependenciesContext = createContext<AppDependencies | null>(null);

export function useDependencies(): AppDependencies {
  const dependencies = useContext(DependenciesContext);
  if (dependencies === null) {
    throw new Error('useDependencies must be used inside DependenciesContext');
  }

  return dependencies;
}
