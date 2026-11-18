import type { AppDependencies } from '../app/dependencies';

export const FIXTURE_VERSION = '0.1.0';

export function createFixtureDependencies(): AppDependencies {
  return {
    runtimeInfo: {
      loadRuntimeInfo: async () => ({ adapter: 'fixture', version: FIXTURE_VERSION }),
    },
  };
}
