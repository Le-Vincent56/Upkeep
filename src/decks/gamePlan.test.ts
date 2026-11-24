import { describe, expect, it } from 'vitest';
import { DeckEditError } from './edits';
import { checkGamePlan, MAX_GAME_PLAN_LENGTH, normalizeGamePlan } from './gamePlan';

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
}

describe('normalizeGamePlan', () => {
  it('makes one trimmed paragraph', () => {
    expect(normalizeGamePlan('  Ramp.\n\nThen   win.  ')).toBe('Ramp. Then win.');
    expect(normalizeGamePlan('a\tb\r\nc')).toBe('a b c');
  });

  it('leaves nothing of a blank text', () => {
    expect(normalizeGamePlan('   ')).toBe('');
    expect(normalizeGamePlan('')).toBe('');
  });
});

describe('checkGamePlan', () => {
  it('holds 280 characters', () => {
    expect(MAX_GAME_PLAN_LENGTH).toBe(280);
    expect(checkGamePlan('x'.repeat(280))).toBe('x'.repeat(280));
  });

  it('refuses 281 characters', () => {
    const error = thrown(() => checkGamePlan('x'.repeat(281)));

    expect(error).toBeInstanceOf(DeckEditError);
    expect(error).toMatchObject({
      code: 'gamePlanTooLong',
      message: 'A game plan holds at most 280 characters',
    });
  });

  it('measures the text after normalizing it', () => {
    expect(checkGamePlan(' ' + 'x'.repeat(280) + '\n')).toBe('x'.repeat(280));
  });

  it('accepts an empty game plan', () => {
    expect(checkGamePlan('')).toBe('');
  });
});
