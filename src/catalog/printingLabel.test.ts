import { describe, expect, it } from 'vitest';
import { printingLabel } from './printingLabel';
import { seedIndex } from './seedCatalog';

describe('printingLabel', () => {
  it('names set and collector number, with an optional finish', () => {
    const commanderMasters = seedIndex.printingBySetAndNumber('cmm', '410');
    if (commanderMasters === undefined) throw new Error('CMM 410 is not seeded');

    expect(printingLabel(commanderMasters, null)).toBe('CMM 410');
    expect(printingLabel(commanderMasters, 'foil')).toBe('CMM 410 · Foil');
    expect(printingLabel(commanderMasters, 'etched')).toBe('CMM 410 · Etched');
    expect(printingLabel(commanderMasters, 'nonfoil')).toBe('CMM 410 · Nonfoil');
  });
});
