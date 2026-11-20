import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Declaration {
  readonly file: string;
  readonly value: string;
}

const SRC = join(import.meta.dirname, 'src');

const modules = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.module.css'))
  .map((file) => ({
    file: file.replaceAll('\\', '/'),
    css: readFileSync(join(SRC, file), 'utf8'),
  }));

const tokens = readFileSync(join(SRC, 'app', 'tokens.css'), 'utf8');

function declarations(property: string): Declaration[] {
  const pattern = new RegExp(`(?<![-\\w])${property}\\s*:\\s*([^;]+);`, 'g');
  return modules.flatMap(({ file, css }) =>
    [...css.matchAll(pattern)].map((match) => ({ file, value: (match[1] ?? '').trim() })),
  );
}

function definedTokens(): Set<string> {
  return new Set([...tokens.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1] ?? ''));
}

function layerOrder(): string[] {
  return [...tokens.matchAll(/(--layer-[a-z-]+)\s*:\s*(\d+)\s*;/g)]
    .map((match) => ({ name: match[1] ?? '', value: Number(match[2]) }))
    .sort((a, b) => a.value - b.value)
    .map((layer) => layer.name);
}

describe('stylesheets', () => {
  it('finds the module stylesheets', () => {
    expect(modules.map((module) => module.file)).toContain(
      'features/deckDetail/DeckCards.module.css',
    );
  });

  it('stacks only with layer tokens', () => {
    const raw = declarations('z-index').filter(
      (declaration) => !/^var\(--layer-[a-z-]+\)$/.test(declaration.value),
    );
    expect(raw).toEqual([]);
  });

  it('sizes text only with type tokens or em', () => {
    const raw = declarations('font-size').filter(
      (declaration) =>
        !/^var\(--text-[a-z-]+\)$/.test(declaration.value) &&
        !/^\d*\.?\d+em$/.test(declaration.value),
    );
    expect(raw).toEqual([]);
  });

  it('uses only layer and type tokens that tokens.css defines', () => {
    const defined = definedTokens();
    const undefinedTokens = modules.flatMap(({ file, css }) =>
      [...css.matchAll(/var\((--(?:layer|text)-[a-z0-9-]+)\)/g)]
        .map((match) => match[1] ?? '')
        .filter((token) => !defined.has(token))
        .map((token) => ({ file, token })),
    );
    expect(undefinedTokens).toEqual([]);
  });

  it('keeps the pop-up above the grain, and the grain above the page', () => {
    expect(layerOrder()).toEqual([
      '--layer-row-focus',
      '--layer-sticky',
      '--layer-menu',
      '--layer-grain',
      '--layer-popup',
    ]);
  });
});
