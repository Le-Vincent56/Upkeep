import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { isOutside, popupTurn } from './popupPlacement';

export type PopupSource = 'pointer' | 'focus';

export interface ShownPopup {
  readonly entryId: string;
  readonly anchor: HTMLElement;
  readonly source: PopupSource;
  readonly motion: 'appear' | 'swap';
  readonly turn: number;
  readonly count: number;
}

export interface CardPopupHandle {
  readonly shown: ShownPopup | null;
  readonly placeTick: number;
  onPointerMove(event: PointerEvent<HTMLElement>): void;
  onPointerLeave(): void;
  onFocus(event: FocusEvent<HTMLElement>): void;
  onBlur(event: FocusEvent<HTMLElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
}

interface PopupState {
  readonly shown: ShownPopup | null;
  readonly token: object;
  readonly count: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

function rowAt(target: EventTarget, container: HTMLElement | null): HTMLElement | null {
  if (!(target instanceof Element) || container === null) return null;

  const row = target.closest<HTMLElement>('li[data-entry-id]');
  return row !== null && container.contains(row) ? row : null;
}

export function useCardPopup(
  token: object,
  containerRef: RefObject<HTMLDivElement | null>,
): CardPopupHandle {
  const lastPointer = useRef<Point | null>(null);
  const [state, setState] = useState<PopupState>({ shown: null, token, count: 0 });
  const [placeTick, setPlaceTick] = useState(0);

  const shown = state.token === token ? state.shown : null;
  const source = shown?.source ?? null;
  const anchor = shown?.anchor ?? null;

  useEffect(() => {
    const column = containerRef.current?.closest('[data-screen-column]') ?? null;
    if (source === null || anchor === null || column === null) return;

    const onScroll = () => {
      if (
        source === 'focus' &&
        !isOutside(anchor.getBoundingClientRect(), column.getBoundingClientRect())
      ) {
        setPlaceTick((tick) => tick + 1);
        return;
      }

      setState((current) => (current.shown === null ? current : { ...current, shown: null }));
    };

    column.addEventListener('scroll', onScroll, { passive: true });
    return () => column.removeEventListener('scroll', onScroll);
  }, [source, anchor, containerRef]);

  function show(row: HTMLElement, from: PopupSource) {
    const entryId = row.dataset.entryId;
    if (entryId === undefined) return;

    // Drawn here, in the event, because render must stay pure.
    const turn = popupTurn(Math.random);
    setState((current) => {
      const showing = current.token === token ? current.shown : null;
      if (showing?.entryId === entryId) {
        return showing.source === from
          ? current
          : { ...current, shown: { ...showing, source: from } };
      }

      const count = current.count + 1;
      const motion = showing === null ? 'appear' : 'swap';
      return { token, count, shown: { entryId, anchor: row, source: from, motion, turn, count } };
    });
  }

  function hide() {
    setState((current) => (current.shown === null ? current : { ...current, shown: null }));
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    // Content scrolling under a still pointer fires moves at the same spot; only a real move shows a card.
    const last = lastPointer.current;
    if (last !== null && last.x === event.clientX && last.y === event.clientY) return;
    lastPointer.current = { x: event.clientX, y: event.clientY };

    const row = rowAt(event.target, containerRef.current);
    if (row === null) return;
    if (shown !== null && shown.entryId === row.dataset.entryId && shown.source === 'pointer') {
      return;
    }

    show(row, 'pointer');
  }

  function onFocus(event: FocusEvent<HTMLElement>) {
    const row = rowAt(event.target, containerRef.current);
    if (row !== null && row.matches(':focus-visible')) show(row, 'focus');
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) hide();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') hide();
  }

  return {
    shown,
    placeTick,
    onPointerMove,
    onPointerLeave: hide,
    onFocus,
    onBlur,
    onKeyDown,
  };
}
