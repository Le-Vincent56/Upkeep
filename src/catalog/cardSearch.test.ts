import { describe, expect, it } from 'vitest';
import { cardMatches, parseSetNumber } from './cardSearch';
import { seedIndex } from './seedCatalog';

function describeMatches(text: string, limit = 8): string[] {
  return cardMatches(seedIndex, text, limit).map(({ card, printing }) =>
    printing === null
      ? card.name
      : `${card.name} · ${printing.setCode.toUpperCase()} ${printing.collectorNumber}`,
  );
}

describe('parseSetNumber', () => {
  it('reads a set code and a collector number', () => {
    for (const text of ['cmm 410', 'CMM/410', ' cmm / 410 ', 'cmm   410']) {
      expect(parseSetNumber(text)).toEqual({ setCode: 'cmm', collectorNumber: '410' });
    }
    expect(parseSetNumber('mh2 236')).toEqual({ setCode: 'mh2', collectorNumber: '236' });
  });

  it('reads only the shape, not whether the printing exists', () => {
    expect(parseSetNumber('sol ring')).toEqual({ setCode: 'sol', collectorNumber: 'ring' });
  });

  it('refuses anything else', () => {
    for (const text of ['c 410', 'toolongset 1', 'cmm 410 foil', 'cmm', '', '   ', 'cmm//410']) {
      expect(parseSetNumber(text)).toBeNull();
    }
  });
});

describe('cardMatches', () => {
  it('puts a set-and-number printing first', () => {
    expect(describeMatches('cmm 410')).toEqual(['Sol Ring · CMM 410']);
    expect(describeMatches('MH2/236')).toEqual(['Sol Talisman · MH2 236']);
    expect(describeMatches(' tla 285 ')).toEqual(['Mountain · TLA 285']);
  });

  it('offers name matches with no printing', () => {
    const matches = cardMatches(seedIndex, 'sol', 8);

    expect(matches.map((match) => match.card.name)).toEqual(['Sol Ring', 'Sol Talisman']);
    expect(matches.every((match) => match.printing === null)).toBe(true);
  });

  it('finds nothing for an unknown printing or name', () => {
    expect(describeMatches('cmm 999')).toEqual([]);
    expect(describeMatches('xyz')).toEqual([]);
    expect(describeMatches('   ')).toEqual([]);
  });

  it('never returns more than the limit', () => {
    expect(describeMatches('s', 2)).toEqual(['Sol Ring', 'Sol Talisman']);
    expect(describeMatches('cmm 410', 1)).toEqual(['Sol Ring · CMM 410']);
  });
});
