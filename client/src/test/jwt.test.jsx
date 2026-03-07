import { describe, it, expect } from 'vitest';
import { parseJwt } from '../utils/jwt';

describe('parseJwt', () => {
  it('returns null for invalid token', () => {
    expect(parseJwt('invalid')).toBeNull();
  });
});
