import { describe, expect, it } from 'vitest';
import { describeError } from './describeError';

describe('describeError', () => {
  it("uses an Error's message", () => {
    expect(describeError(new Error('disk unplugged'))).toBe('disk unplugged');
  });

  it('shows a rejected string as is', () => {
    expect(describeError('command not found')).toBe('command not found');
  });

  it('shows an object as JSON', () => {
    expect(describeError({ code: 'E1' })).toBe('{"code":"E1"}');
  });

  it('falls back to String for undefined', () => {
    expect(describeError(undefined)).toBe('undefined');
  });
});
