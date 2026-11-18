export type AdapterKind = 'fixture' | 'desktop';

export interface RuntimeInfo {
  adapter: AdapterKind;
  version: string;
}

/** Reports which adapter is serving the UI and which app version it belongs to */
export interface RuntimeInfoReader {
  loadRuntimeInfo(): Promise<RuntimeInfo>;
}
