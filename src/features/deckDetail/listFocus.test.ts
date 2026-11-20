import { describe, expect, it } from 'vitest';
import { arrangeRows, DEFAULT_VIEW_CHOICES } from './arrangeRows';
import { isStopKey, listStop, nextStop, stopOrder } from './listFocus';
import { walkthroughRows } from './testRows';

const ids = ['a', 'b', 'c'];

describe('nextStop', () => {
  it('moves down and up through the rows', () => {
    expect(nextStop(ids, 'b', 'ArrowDown')).toBe('c');
    expect(nextStop(ids, 'b', 'ArrowUp')).toBe('a');
  });

  it('does not wrap at either end', () => {
    expect(nextStop(ids, 'c', 'ArrowDown')).toBeNull();
    expect(nextStop(ids, 'a', 'ArrowUp')).toBeNull();
  });

  it('jumps to the ends', () => {
    expect(nextStop(ids, 'b', 'Home')).toBe('a');
    expect(nextStop(ids, 'b', 'End')).toBe('c');
  });

  it('has nowhere to go from a row it does not know', () => {
    expect(nextStop(ids, 'x', 'ArrowDown')).toBeNull();
  });
});

describe('isStopKey', () => {
  it('handles only arrows up and down, Home, and End', () => {
    expect(['ArrowDown', 'ArrowUp', 'Home', 'End'].every(isStopKey)).toBe(true);
    expect(['ArrowLeft', 'Tab', 'Enter', 'Escape', 'a'].some(isStopKey)).toBe(false);
  });
});

describe('listStop', () => {
  it('keeps the remembered row while it is shown', () => {
    expect(listStop(ids, 'b')).toBe('b');
  });

  it('falls back to the first row when the remembered one is gone, or none is', () => {
    expect(listStop(ids, 'x')).toBe('a');
    expect(listStop(ids, null)).toBe('a');
  });

  it('has no stop in an empty list', () => {
    expect(listStop([], 'b')).toBeNull();
  });
});

describe('stopOrder', () => {
  it('reads groups in order, then rows within each', () => {
    const { rows, plannedDeck } = walkthroughRows();
    const arrangement = arrangeRows(rows, plannedDeck.counts, DEFAULT_VIEW_CHOICES);

    expect(stopOrder(arrangement)).toEqual(
      arrangement.groups.flatMap((group) => group.rows.map((shown) => shown.row.entryId)),
    );
    expect(stopOrder(arrangement)).toHaveLength(3);
  });
});
