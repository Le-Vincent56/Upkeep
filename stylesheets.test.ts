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

interface SeedImage {
  readonly accent?: string;
}

interface SeedPrinting {
  readonly images: readonly SeedImage[];
}

function channel(hex: string): number {
  const value = Number.parseInt(hex, 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) => channel(color.slice(at, at + 2)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// The filled next action sets --color-on-accent (the background colour) on the deck's accent,
// and a deck's accent is its header art's first image.
describe('accent contrast', () => {
  it('keeps background-coloured text readable on every header accent', () => {
    const background = /--color-bg:\s*(#[0-9a-f]{6})\s*;/i.exec(tokens)?.[1];
    const seed = JSON.parse(readFileSync(join(SRC, 'catalog', 'seed.json'), 'utf8')) as {
      readonly printings: readonly SeedPrinting[];
    };
    const accents = seed.printings.flatMap((printing) => printing.images[0]?.accent ?? []);

    expect(background).toBeDefined();
    expect(accents.length).toBeGreaterThan(0);
    const unreadable = accents.filter((accent) => contrast(accent, background ?? '') < 4.5);
    expect(unreadable).toEqual([]);
  });
});
