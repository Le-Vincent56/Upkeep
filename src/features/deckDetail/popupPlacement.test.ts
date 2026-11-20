import { describe, expect, it } from 'vitest';
import {
  CARD_RATIO,
  isOutside,
  placePopup,
  POPUP_EDGE,
  POPUP_GAP,
  popupTurn,
  TURN_MAX,
  type Box,
} from './popupPlacement';

const bounds: Box = { left: 0, top: 48, right: 1280, bottom: 800 };
const size = { width: 252, height: 420 };

function box(left: number, top: number, width: number, height: number): Box {
  return { left, top, right: left + width, bottom: top + height };
}

describe('placePopup', () => {
  it('sits right of the row, the card’s 42% point on the row’s middle', () => {
    const place = placePopup(box(40, 300, 500, 40), bounds, size);

    expect(place).toMatchObject({ left: 540 + POPUP_GAP, side: 'right' });
    expect(place?.top).toBeCloseTo(320 - 252 * CARD_RATIO * 0.42);
  });

  it('flips left when the right side would leave the column', () => {
    expect(placePopup(box(700, 300, 500, 40), bounds, size)).toMatchObject({
      left: 700 - POPUP_GAP - 252,
      side: 'left',
    });
  });

  it('falls back over the row’s right end when neither side fits', () => {
    const narrow: Box = { left: 0, top: 48, right: 800, bottom: 800 };

    expect(placePopup(box(40, 300, 720, 40), narrow, size)).toMatchObject({
      left: 760 - 252,
      side: 'right',
    });
  });

  it('keeps the whole pop-up inside the column at the top and the bottom', () => {
    expect(placePopup(box(40, 50, 500, 40), bounds, size)?.top).toBe(48 + POPUP_EDGE);
    expect(placePopup(box(40, 760, 500, 40), bounds, size)?.top).toBe(800 - POPUP_EDGE - 420);
  });

  it('pins a pop-up taller than the column to its top', () => {
    const short: Box = { left: 0, top: 48, right: 1280, bottom: 400 };

    expect(placePopup(box(40, 200, 500, 40), short, size)?.top).toBe(48 + POPUP_EDGE);
  });

  it('still places a row partly inside the column', () => {
    expect(placePopup(box(40, 30, 500, 40), bounds, size)).not.toBeNull();
  });

  it('has no place for a row wholly above or below the column', () => {
    expect(placePopup(box(40, 0, 500, 40), bounds, size)).toBeNull();
    expect(placePopup(box(40, 800, 500, 40), bounds, size)).toBeNull();
  });
});

describe('isOutside', () => {
  it('is outside only when the row is wholly above or below the column', () => {
    expect(isOutside(box(40, 0, 500, 40), bounds)).toBe(true);
    expect(isOutside(box(40, 800, 500, 40), bounds)).toBe(true);
    expect(isOutside(box(40, 30, 500, 40), bounds)).toBe(false);
    expect(isOutside(box(40, 780, 500, 40), bounds)).toBe(false);
  });
});

describe('popupTurn', () => {
  const sequence =
    (...values: number[]) =>
    () =>
      values.shift() ?? 0;

  it('turns at least 6° and under 12°, either way', () => {
    expect(popupTurn(sequence(0, 0))).toBe(-6);
    expect(popupTurn(sequence(0, 0.5))).toBe(6);
    expect(popupTurn(sequence(0.5, 0.9))).toBe(9);

    const largest = popupTurn(sequence(0.999999, 0.9));
    expect(largest).toBeLessThan(TURN_MAX);
    expect(largest).toBeGreaterThan(11.99);
  });
});
