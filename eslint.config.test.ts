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
