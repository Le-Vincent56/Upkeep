import { describe, expect, it } from 'vitest';
import config from './vite.config';

describe('dev server', () => {
  it('fails instead of moving off port 5173', () => {
    expect(config.server?.port).toBe(5173);
    expect(config.server?.strictPort).toBe(true);
  });
});
