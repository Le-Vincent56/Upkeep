export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export type PopupSide = 'right' | 'left';

export interface PopupPlace {
  readonly left: number;
  readonly top: number;
  readonly side: PopupSide;
}

export const POPUP_GAP = 16;
export const POPUP_EDGE = 8;
export const CARD_RATIO = 680 / 488;
export const TURN_MIN = 6;
export const TURN_MAX = 12;

const ANCHOR_POINT = 0.42;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function across(row: Box, bounds: Box, width: number): Omit<PopupPlace, 'top'> {
  const right = row.right + POPUP_GAP;
  if (right + width <= bounds.right - POPUP_EDGE) return { left: right, side: 'right' };

  const left = row.left - POPUP_GAP - width;
  if (left >= bounds.left + POPUP_EDGE) return { left, side: 'left' };

  return {
    left: clamp(row.right - width, bounds.left + POPUP_EDGE, bounds.right - POPUP_EDGE - width),
    side: 'right',
  };
}

export function isOutside(row: Box, bounds: Box): boolean {
  return row.bottom <= bounds.top || row.top >= bounds.bottom;
}

export function placePopup(row: Box, bounds: Box, size: Size): PopupPlace | null {
  if (row.bottom <= bounds.top || row.top >= bounds.bottom) return null;

  const middle = (row.top + row.bottom) / 2;
  const top = clamp(
    middle - size.width * CARD_RATIO * ANCHOR_POINT,
    bounds.top + POPUP_EDGE,
    bounds.bottom - POPUP_EDGE - size.height,
  );

  return { ...across(row, bounds, size.width), top };
}

export function popupTurn(random: () => number): number {
  const magnitude = TURN_MIN + random() * (TURN_MAX - TURN_MIN);
  return random() < 0.5 ? -magnitude : magnitude;
}
