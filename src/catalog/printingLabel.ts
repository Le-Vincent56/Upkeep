import type { Finish, Printing } from './types';

export const FINISH_WORDS: Record<Finish, string> = {
  nonfoil: 'Nonfoil',
  foil: 'Foil',
  etched: 'Etched',
};

export function printingLabel(printing: Printing, finish: Finish | null): string {
  const label = `${printing.setCode.toUpperCase()} ${printing.collectorNumber}`;
  return finish === null ? label : `${label} · ${FINISH_WORDS[finish]}`;
}
