import { buildCatalogIndex, type CatalogIndex } from './catalogIndex';
import { loadCatalog } from './loadCatalog';
import seed from './seed.json';
import type { Catalog } from './types';

export const seedCatalog: Catalog = loadCatalog(seed);
export const seedIndex: CatalogIndex = buildCatalogIndex(seedCatalog);
