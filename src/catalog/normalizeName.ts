const COMBINING_MARKS = /\p{M}/gu;
const APOSTROPHES = /['’]/gu;
const SEPARATORS = /[^\p{L}\p{N}]+/gu;

export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(SEPARATORS, ' ')
    .trim();
}

export function setNumberKey(setCode: string, collectorNumber: string): string {
  return `${setCode.trim().toLowerCase()} ${collectorNumber.trim()}`;
}
