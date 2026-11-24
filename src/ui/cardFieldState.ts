import type { CardMatch } from '../catalog/cardSearch';
import { printingLabel } from '../catalog/printingLabel';

export interface CardFieldState {
  readonly text: string;
  readonly matches: readonly CardMatch[];
  readonly open: boolean;
  readonly highlighted: number;
  readonly chosen: CardMatch | null;
}

export type CardFieldEvent =
  | { readonly type: 'typed'; readonly text: string; readonly matches: readonly CardMatch[] }
  | { readonly type: 'down' }
  | { readonly type: 'up' }
  | { readonly type: 'escape' }
  | { readonly type: 'pick'; readonly index: number }
  | { readonly type: 'leave' }
  | { readonly type: 'reset' };

export const EMPTY_CARD_FIELD: CardFieldState = {
  text: '',
  matches: [],
  open: false,
  highlighted: 0,
  chosen: null,
};

export function matchLabel(match: CardMatch): string {
  return match.printing === null
    ? match.card.name
    : `${match.card.name} · ${printingLabel(match.printing, null)}`;
}

function choose(state: CardFieldState, index: number): CardFieldState {
  const match = state.matches[index];
  if (match === undefined) return state;

  return { ...state, text: matchLabel(match), open: false, chosen: match };
}

export function cardFieldReducer(state: CardFieldState, event: CardFieldEvent): CardFieldState {
  switch (event.type) {
    case 'typed':
      return {
        text: event.text,
        matches: event.matches,
        open: event.matches.length > 0,
        highlighted: 0,
        chosen: null,
      };

    case 'down':
      if (!state.open) {
        if (state.matches.length === 0) return state;
        const at = state.chosen === null ? 0 : Math.max(state.matches.indexOf(state.chosen), 0);
        return { ...state, open: true, highlighted: at };
      }
      return { ...state, highlighted: Math.min(state.highlighted + 1, state.matches.length - 1) };

    case 'up':
      return state.open ? { ...state, highlighted: Math.max(state.highlighted - 1, 0) } : state;

    case 'escape':
      return state.open ? { ...state, open: false } : state;

    case 'pick':
      return choose(state, event.index);

    case 'leave':
      return state.open ? choose(state, state.highlighted) : state;

    case 'reset':
      return EMPTY_CARD_FIELD;
  }
}

export function submittedMatch(state: CardFieldState): CardMatch | null {
  if (state.open) return state.matches[state.highlighted] ?? null;

  return state.chosen ?? state.matches[0] ?? null;
}
