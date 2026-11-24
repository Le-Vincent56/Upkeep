import { describe, expect, it } from 'vitest';
import { cardMatches, CARD_MATCH_LIMIT } from '../../catalog/cardSearch';
import { seedIndex } from '../../catalog/seedCatalog';
import type { DeckEntry } from '../../decks/types';
import { CARDS, IDS, PRINTINGS } from '../../planning/fixtures/zukoHydras';
import { cardFieldReducer, EMPTY_CARD_FIELD, type CardFieldState } from '../../ui/cardFieldState';
import { addAttempt, addResultLine } from './addToDeck';

const FIRE_LORD_ZUKO = 'a129423d-c886-4120-96f7-c2517ea7eb83';
const FIRE_COVENANT = '025939a0-424a-41bf-8fc9-2ef9ea5485f7';
const SOL_TALISMAN = '867f0cdf-cf75-40f0-bf1e-ccb92e55e9a3';
const QUANTITY_LINE = 'A quantity must be a whole number from 1 to 999';

function fieldWith(text: string): CardFieldState {
  return cardFieldReducer(EMPTY_CARD_FIELD, {
    type: 'typed',
    text,
    matches: cardMatches(seedIndex, text, CARD_MATCH_LIMIT),
  });
}

function entry(
  oracleId: string,
  section: DeckEntry['section'],
  quantity: number,
  printing: DeckEntry['printing'] = null,
  id = 'n1',
): DeckEntry {
  return { id, oracleId, section, quantity, printing };
}

describe('addAttempt', () => {
  it('does nothing with nothing typed', () => {
    expect(addAttempt(EMPTY_CARD_FIELD, 'main', '1', 'n1')).toEqual({ kind: 'none' });
    expect(addAttempt(fieldWith('   '), 'main', '1', 'n1')).toEqual({ kind: 'none' });
  });

  it('refuses text that matches no card, naming the trimmed text', () => {
    expect(addAttempt(fieldWith('xyz'), 'main', '1', 'n1')).toEqual({
      kind: 'refused',
      line: 'No card matches ‘xyz’',
    });
    expect(addAttempt(fieldWith('  xyz '), 'main', '1', 'n1')).toEqual({
      kind: 'refused',
      line: 'No card matches ‘xyz’',
    });
  });

  it('sends the submitted match with the section, quantity, and ID', () => {
    expect(addAttempt(fieldWith('fire'), 'commander', '2', 'n1')).toEqual({
      kind: 'send',
      entry: entry(FIRE_COVENANT, 'commander', 2),
    });
    expect(addAttempt(fieldWith('fire'), 'main', ' 3 ', 'n1')).toEqual({
      kind: 'send',
      entry: entry(FIRE_COVENANT, 'main', 3),
    });
  });

  it('sends a set-and-number match as an exact printing with any finish', () => {
    expect(addAttempt(fieldWith('cmm 410'), 'main', '1', 'n1')).toEqual({
      kind: 'send',
      entry: entry(CARDS.solRing, 'main', 1, {
        printingId: PRINTINGS.solRingCommanderMasters,
        finish: null,
      }),
    });
  });

  it('refuses a quantity that is not a whole number from 1 to 999', () => {
    for (const quantity of ['0', '1000', '2.5', '', 'abc']) {
      expect(addAttempt(fieldWith('fire'), 'main', quantity, 'n1')).toEqual({
        kind: 'refused',
        line: QUANTITY_LINE,
      });
    }
  });

  it('names the card problem first when both are wrong', () => {
    expect(addAttempt(fieldWith('xyz'), 'main', '0', 'n1')).toEqual({
      kind: 'refused',
      line: 'No card matches ‘xyz’',
    });
  });
});

describe('addResultLine', () => {
  const cmm = { printingId: PRINTINGS.solRingCommanderMasters, finish: null };
  const tle = { printingId: PRINTINGS.solRingAvatar, finish: null };

  it('names a new entry', () => {
    const zuko = entry(FIRE_LORD_ZUKO, 'commander', 1);
    expect(addResultLine(zuko, { kind: 'added', entry: zuko }, seedIndex)).toBe(
      'Added Fire Lord Zuko ×1 to Commander',
    );

    const exact = entry(CARDS.solRing, 'main', 1, cmm);
    expect(addResultLine(exact, { kind: 'added', entry: exact }, seedIndex)).toBe(
      'Added Sol Ring · CMM 410 ×1 to Main',
    );
  });

  it('names the raised entry and its new quantity', () => {
    const asked = entry(CARDS.solRing, 'main', 1);
    expect(
      addResultLine(
        asked,
        { kind: 'merged', entry: entry(CARDS.solRing, 'main', 2, null, IDS.zukoSolRing) },
        seedIndex,
      ),
    ).toBe('Sol Ring is now ×2 in Main');

    const idea = entry(CARDS.solRing, 'maybeboard', 1, tle);
    expect(
      addResultLine(
        idea,
        {
          kind: 'merged',
          entry: entry(CARDS.solRing, 'maybeboard', 2, tle, IDS.zukoMaybeSolRing),
        },
        seedIndex,
      ),
    ).toBe('Sol Ring · TLE 316 is now ×2 in Maybeboard');

    const foil = { printingId: PRINTINGS.solRingCommanderMasters, finish: 'foil' as const };
    expect(
      addResultLine(
        entry(CARDS.solRing, 'main', 1, foil),
        { kind: 'merged', entry: entry(CARDS.solRing, 'main', 2, foil, 'entry-foil') },
        seedIndex,
      ),
    ).toBe('Sol Ring · CMM 410 · Foil is now ×2 in Main');
  });

  it('says why an addition did not land', () => {
    const talisman = entry(SOL_TALISMAN, 'sideboard', 1);

    expect(addResultLine(talisman, { kind: 'failed', message: 'disk full' }, seedIndex)).toBe(
      "Couldn't add this card · disk full",
    );
    expect(addResultLine(talisman, { kind: 'dropped' }, seedIndex)).toBe(
      "Couldn't add Sol Talisman · an earlier change failed",
    );
  });
});
