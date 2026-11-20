import { useState, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { isStopKey, listStop, nextStop } from './listFocus';

export interface ListFocusHandle {
  readonly stopId: string | null;
  onFocus(event: FocusEvent<HTMLElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
}

function entryIdOf(target: EventTarget): string | undefined {
  return target instanceof HTMLElement ? target.dataset.entryId : undefined;
}

export function useListFocus(
  ids: readonly string[],
  containerRef: RefObject<HTMLDivElement | null>,
): ListFocusHandle {
  const [remembered, setRemembered] = useState<string | null>(null);

  function onFocus(event: FocusEvent<HTMLElement>) {
    const entryId = entryIdOf(event.target);
    if (entryId !== undefined) setRemembered(entryId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const current = entryIdOf(event.target);
    if (current === undefined || !isStopKey(event.key)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    event.preventDefault();
    const next = nextStop(ids, current, event.key);
    if (next === null) return;

    const row = containerRef.current?.querySelector<HTMLElement>(
      `li[data-entry-id="${CSS.escape(next)}"]`,
    );
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'nearest' });
  }

  return { stopId: listStop(ids, remembered), onFocus, onKeyDown };
}
