import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const BOUNDARY_RULES = new Set(['no-restricted-imports', 'no-restricted-syntax']);
const STATIC_IMPORT =
  "import { invoke } from '@tauri-apps/api/core';\nexport const probe = invoke;\n";
const DYNAMIC_IMPORT = "export const probe = () => import('@tauri-apps/api/core');\n";

const eslint = new ESLint();

async function boundaryMessages(filePath: string, code: string): Promise<Linter.LintMessage[]> {
  const results = await eslint.lintText(code, { filePath });
  return results.flatMap((result) =>
    result.messages.filter(
      (message) => message.ruleId !== null && BOUNDARY_RULES.has(message.ruleId),
    ),
  );
}

describe('Tauri import boundary', () => {
  it('rejects a static Tauri import outside src/adapters', async () => {
    const messages = await boundaryMessages('src/app/Probe.ts', STATIC_IMPORT);
    expect(messages.map((message) => message.ruleId)).toEqual(['no-restricted-imports']);
  });

  it('rejects a dynamic Tauri import outside src/adapters', async () => {
    const messages = await boundaryMessages('src/app/Probe.ts', DYNAMIC_IMPORT);
    expect(messages.map((message) => message.ruleId)).toEqual(['no-restricted-syntax']);
  });

  it('allows Tauri imports inside src/adapters', async () => {
    const messages = await boundaryMessages('src/adapters/probe.ts', STATIC_IMPORT);
    expect(messages).toEqual([]);
  });
});

describe('catalog boundary', () => {
  const CATALOG_FILE = 'src/catalog/probe.ts';

  async function ruleIds(code: string): Promise<(string | null)[]> {
    const messages = await boundaryMessages(CATALOG_FILE, code);
    return messages.map((message) => message.ruleId);
  }

  it('rejects React', async () => {
    expect(
      await ruleIds("import { useState } from 'react';\nexport const probe = useState;\n"),
    ).toEqual(['no-restricted-imports']);
  });

  it('rejects a relative import of the app shell', async () => {
    expect(
      await ruleIds(
        "import type { RuntimeInfo } from '../app/runtimeInfo';\nexport type P = RuntimeInfo;\n",
      ),
    ).toEqual(['no-restricted-imports']);
  });

  it('rejects a relative import of an adapter', async () => {
    expect(
      await ruleIds(
        "import { createFixtureDependencies } from '../adapters/fixture';\nexport const probe = createFixtureDependencies;\n",
      ),
    ).toEqual(['no-restricted-imports']);
  });

  it('still rejects Tauri', async () => {
    expect(await ruleIds(STATIC_IMPORT)).toEqual(['no-restricted-imports']);
  });

  it('allows sibling catalog imports', async () => {
    expect(
      await ruleIds(
        "import type { Card } from './types';\nimport seed from './seed.json';\nexport const probe: [Card | undefined, unknown] = [undefined, seed];\n",
      ),
    ).toEqual([]);
  });
});
