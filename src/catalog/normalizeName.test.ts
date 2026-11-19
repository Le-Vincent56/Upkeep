import { describe, expect, it } from 'vitest';
import { normalizeName } from './normalizeName';

describe('normalizeName', () => {
  it.each([
    ['Polukranos, Engine of Ruin', 'polukranos engine of ruin'],
    ['POLUKRANOS—ENGINE OF RUIN', 'polukranos engine of ruin'],
    [
      'Polukranos Reborn // Polukranos, Engine of Ruin',
      'polukranos reborn polukranos engine of ruin',
    ],
    ['  Sol   Ring ', 'sol ring'],
    ['Lim-Dûl the Necromancer', 'lim dul the necromancer'],
    ["Urza's Saga", 'urzas saga'],
    ['Urza’s Saga', 'urzas saga'],
    ['', ''],
    [' — ', ''],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});
