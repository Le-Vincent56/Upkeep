import { invoke } from '@tauri-apps/api/core';
import type { AppDependencies } from '../app/dependencies';
import type { RuntimeInfo } from '../app/runtimeInfo';

export function createTauriDependencies(): AppDependencies {
  return {
    runtimeInfo: {
      loadRuntimeInfo: () => invoke<RuntimeInfo>('get_runtime_info'),
    },
  };
}
