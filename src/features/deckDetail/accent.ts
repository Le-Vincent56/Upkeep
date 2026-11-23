import type { CSSProperties } from 'react';

export interface AccentProps {
  readonly style?: CSSProperties;
  readonly 'data-accent'?: '';
}

// data-accent makes tokens.css derive --color-status-move again from this accent, so both go
// together, and again on anything portalled out of the deck.
export function accentProps(accent: string | null): AccentProps {
  if (accent === null) return {};

  return { style: { '--color-accent': accent } as CSSProperties, 'data-accent': '' };
}
