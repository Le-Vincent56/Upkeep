import { isTauri } from '@tauri-apps/api/core';
import type { AppDependencies } from '../app/dependencies';
import { createFixtureDependencies } from './fixture';
import { createTauriDependencies } from './tauri';

export async function loadDependencies(insideTauri = isTauri()): Promise<AppDependencies> {
  return insideTauri ? createTauriDependencies() : createFixtureDependencies();
}
