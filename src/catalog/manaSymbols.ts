const SYMBOL = /\{([^{}]+)\}/g;

export function manaSymbolCodes(manaCost: string): string[] {
  return Array.from(manaCost.matchAll(SYMBOL), (match) => (match[1] ?? '').replaceAll('/', ''));
}

export function manaSymbolUrl(code: string): string {
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(code)}.svg`;
}
