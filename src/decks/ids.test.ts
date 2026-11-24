import { describe, expect, it } from 'vitest';
import { newEntryId } from './ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newEntryId', () => {
  it('makes a different UUID each time', () => {
    const first = newEntryId();
    const second = newEntryId();

    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(first).not.toBe(second);
  });
});
