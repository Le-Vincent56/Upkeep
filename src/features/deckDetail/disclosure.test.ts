import { describe, expect, it } from 'vitest';
import { dismissal } from './disclosure';

const STAY = { close: false, refocusLabel: false };

describe('dismissal', () => {
  it('closes on Escape from inside and returns focus to the label', () => {
    expect(dismissal({ kind: 'key', key: 'Escape', inside: true })).toEqual({
      close: true,
      refocusLabel: true,
    });
  });

  it('ignores Escape from outside and other keys inside', () => {
    expect(dismissal({ kind: 'key', key: 'Escape', inside: false })).toEqual(STAY);
    expect(dismissal({ kind: 'key', key: 'Enter', inside: true })).toEqual(STAY);
    expect(dismissal({ kind: 'key', key: ' ', inside: true })).toEqual(STAY);
  });

  it('closes on a press outside, leaving focus where the press puts it', () => {
    expect(dismissal({ kind: 'pointer', inside: false })).toEqual({
      close: true,
      refocusLabel: false,
    });
    expect(dismissal({ kind: 'pointer', inside: true })).toEqual(STAY);
  });

  it('closes when focus moves to an element outside', () => {
    expect(dismissal({ kind: 'focus', inside: false })).toEqual({
      close: true,
      refocusLabel: false,
    });
    expect(dismissal({ kind: 'focus', inside: true })).toEqual(STAY);
  });
});
