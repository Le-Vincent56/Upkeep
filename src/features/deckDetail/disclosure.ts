export type DisclosureEvent =
  | { readonly kind: 'key'; readonly key: string; readonly inside: boolean }
  | { readonly kind: 'pointer'; readonly inside: boolean }
  | { readonly kind: 'focus'; readonly inside: boolean };

export interface Dismissal {
  readonly close: boolean;
  readonly refocusLabel: boolean;
}

const STAY: Dismissal = { close: false, refocusLabel: false };

export function dismissal(event: DisclosureEvent): Dismissal {
  if (event.kind === 'key') {
    return event.key === 'Escape' && event.inside ? { close: true, refocusLabel: true } : STAY;
  }

  return event.inside ? STAY : { close: true, refocusLabel: false };
}
