import { describe, expect, it } from 'vitest';
import { cardMatches, CARD_MATCH_LIMIT } from '../catalog/cardSearch';
import { seedIndex } from '../catalog/seedCatalog';
import {
  cardFieldReducer,
  EMPTY_CARD_FIELD,
  matchLabel,
  submittedMatch,
  type CardFieldEvent,
  type CardFieldState,
} from './cardFieldState';

function typed(text: string): CardFieldEvent {
  return { type: 'typed', text, matches: cardMatches(seedIndex, text, CARD_MATCH_LIMIT) };
}

function run(...events: CardFieldEvent[]): CardFieldState {
  return events.reduce(cardFieldReducer, EMPTY_CARD_FIELD);
}

function nameOf(state: CardFieldState): string | null {
  return submittedMatch(state)?.card.name ?? null;
}

const DOWN: CardFieldEvent = { type: 'down' };
const UP: CardFieldEvent = { type: 'up' };
const ESCAPE: CardFieldEvent = { type: 'escape' };
const LEAVE: CardFieldEvent = { type: 'leave' };

describe('cardFieldReducer', () => {
  it('opens on typing with the first match highlighted', () => {
    const state = run(typed('fire'));

    expect(state.text).toBe('fire');
    expect(state.matches.map((match) => match.card.name)).toEqual([
      'Fire Covenant',
      'Fire Lord Zuko',
    ]);
    expect(state.open).toBe(true);
    expect(state.highlighted).toBe(0);
    expect(state.chosen).toBeNull();
  });

  it('stays closed when nothing matches', () => {
    expect(run(typed('xyz')).open).toBe(false);
    expect(run(typed('fire'), typed('')).open).toBe(false);
  });

  it('moves the highlight and stops at both ends', () => {
    expect(run(typed('s'), DOWN).highlighted).toBe(1);
    expect(run(typed('s'), DOWN, DOWN, DOWN, DOWN).highlighted).toBe(2);
    expect(run(typed('s'), DOWN, UP, UP).highlighted).toBe(0);
  });

  it('reopens a closed list at the first match, and only with matches', () => {
    const reopened = run(typed('fire'), DOWN, ESCAPE, DOWN);
    expect(reopened.open).toBe(true);
    expect(reopened.highlighted).toBe(0);

    expect(run(typed('xyz'), DOWN).open).toBe(false);
  });

  it('reopens on the chosen match, so the highlight never hides the card the field shows', () => {
    const picked = run(typed('fire'), { type: 'pick', index: 1 }, DOWN);
    expect(picked.open).toBe(true);
    expect(picked.highlighted).toBe(1);
    expect(nameOf(picked)).toBe('Fire Lord Zuko');

    const left = run(typed('fire'), DOWN, LEAVE, DOWN);
    expect(left.highlighted).toBe(1);
    expect(nameOf(left)).toBe('Fire Lord Zuko');
  });

  it('closes on Escape without choosing, and ignores Escape when closed', () => {
    const closed = run(typed('fire'), DOWN, ESCAPE);
    expect(closed.open).toBe(false);
    expect(closed.text).toBe('fire');
    expect(closed.chosen).toBeNull();

    expect(cardFieldReducer(closed, ESCAPE)).toBe(closed);
  });

  it('chooses a clicked option, whichever is highlighted', () => {
    const state = run(typed('fire'), { type: 'pick', index: 1 });

    expect(state.chosen?.card.name).toBe('Fire Lord Zuko');
    expect(state.text).toBe('Fire Lord Zuko');
    expect(state.open).toBe(false);
  });

  it('chooses the highlighted option on leaving the field, and does nothing when closed', () => {
    const left = run(typed('fire'), DOWN, LEAVE);
    expect(left.chosen?.card.name).toBe('Fire Lord Zuko');
    expect(left.text).toBe('Fire Lord Zuko');
    expect(left.open).toBe(false);

    const closed = run(typed('fire'), ESCAPE);
    expect(cardFieldReducer(closed, LEAVE)).toBe(closed);
  });

  it('forgets a chosen match once the text changes', () => {
    const state = run(typed('fire'), { type: 'pick', index: 1 }, typed('Fire Lord Zuk'));

    expect(state.chosen).toBeNull();
    expect(state.open).toBe(true);
  });

  it('empties on reset', () => {
    expect(run(typed('fire'), DOWN, { type: 'reset' })).toEqual(EMPTY_CARD_FIELD);
  });
});

describe('submittedMatch', () => {
  it('submits the highlighted match while the list is open', () => {
    expect(nameOf(run(typed('fire')))).toBe('Fire Covenant');
    expect(nameOf(run(typed('fire'), DOWN))).toBe('Fire Lord Zuko');
  });

  it('submits the chosen match, else the first match, while closed', () => {
    expect(nameOf(run(typed('fire'), DOWN, LEAVE))).toBe('Fire Lord Zuko');
    expect(nameOf(run(typed('fire'), DOWN, ESCAPE))).toBe('Fire Covenant');
  });

  it('submits nothing when nothing matches', () => {
    expect(submittedMatch(run(typed('xyz')))).toBeNull();
    expect(submittedMatch(EMPTY_CARD_FIELD)).toBeNull();
  });

  it('keeps a set-and-number printing with the match', () => {
    const match = submittedMatch(run(typed('cmm 410')));

    expect(match?.card.name).toBe('Sol Ring');
    expect(match?.printing?.collectorNumber).toBe('410');
  });
});

describe('matchLabel', () => {
  it('names the card, and the printing when there is one', () => {
    const [sol] = cardMatches(seedIndex, 'sol', 1);
    const [cmm] = cardMatches(seedIndex, 'cmm 410', 1);
    if (sol === undefined || cmm === undefined) throw new Error('Expected seed matches');

    expect(matchLabel(sol)).toBe('Sol Ring');
    expect(matchLabel(cmm)).toBe('Sol Ring · CMM 410');
  });
});
