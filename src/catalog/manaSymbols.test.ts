import { describe, expect, it } from 'vitest';
import { manaSymbolCodes, manaSymbolUrl } from './manaSymbols';

describe('manaSymbolCodes', () => {
  it('reads plain symbols in order', () => {
    expect(manaSymbolCodes('{1}{R}')).toEqual(['1', 'R']);
    expect(manaSymbolCodes('{X}{G}{G}')).toEqual(['X', 'G', 'G']);
    expect(manaSymbolCodes('{10}')).toEqual(['10']);
  });

  it('joins the halves of hybrid and Phyrexian symbols', () => {
    expect(manaSymbolCodes('{W/B}{2/U}{G/P}')).toEqual(['WB', '2U', 'GP']);
  });

  it.each(['', 'abc', '{'])('gives nothing for the empty or malformed cost %j', (manaCost) => {
    expect(manaSymbolCodes(manaCost)).toEqual([]);
  });

  it('ignores text outside braces', () => {
    expect(manaSymbolCodes('x{R}y')).toEqual(['R']);
  });
});

describe('manaSymbolUrl', () => {
  it('builds a Scryfall symbol URL', () => {
    expect(manaSymbolUrl('R')).toBe('https://svgs.scryfall.io/card-symbols/R.svg');
    expect(manaSymbolUrl('WB')).toBe('https://svgs.scryfall.io/card-symbols/WB.svg');
  });
});
