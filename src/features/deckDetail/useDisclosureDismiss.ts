import { useEffect, type RefObject } from 'react';
import { dismissal, type DisclosureEvent } from './disclosure';

export function useDisclosureDismiss(detailsRef: RefObject<HTMLDetailsElement | null>): void {
  useEffect(() => {
    function respond(event: Event, describe: (inside: boolean) => DisclosureEvent) {
      const details = detailsRef.current;
      if (details === null || !details.open) return;

      const inside = event.target instanceof Node && details.contains(event.target);
      const outcome = dismissal(describe(inside));
      if (!outcome.close) return;

      details.open = false;
      if (outcome.refocusLabel) details.querySelector('summary')?.focus();
    }

    // With nothing focused, a key arrives at <body>, and Escape still means the open list.
    const onKeyDown = (event: KeyboardEvent) =>
      respond(event, (inside) => ({
        kind: 'key',
        key: event.key,
        inside: inside || event.target === document.body,
      }));
    const onPointerDown = (event: PointerEvent) =>
      respond(event, (inside) => ({ kind: 'pointer', inside }));
    // focusin on the document, not focusout on the list: focusout also fires when the window loses focus.
    const onFocusIn = (event: FocusEvent) =>
      respond(event, (inside) => ({ kind: 'focus', inside }));

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [detailsRef]);
}
