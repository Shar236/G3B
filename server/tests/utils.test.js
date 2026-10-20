import { describe, it, expect } from 'vitest';
import { ApiError } from '../src/utils/ApiError.js';
import { toCsv } from '../src/utils/csv.js';

describe('ApiError', () => {
  it('creates typed errors with status codes', () => {
    expect(ApiError.notFound('nope').status).toBe(404);
    expect(ApiError.forbidden().status).toBe(403);
    expect(ApiError.tooManyRequests().status).toBe(429);
    expect(ApiError.badRequest('bad', { field: 'x' }).details).toEqual({ field: 'x' });
  });
});

describe('toCsv', () => {
  it('serialises rows with a header', () => {
    const csv = toCsv([{ id: 1, name: 'Asha' }], ['id', 'name']);
    expect(csv).toBe('id,name\r\n1,Asha');
  });

  it('escapes commas, quotes and newlines', () => {
    const csv = toCsv([{ note: 'a,"b"\nc' }], ['note']);
    expect(csv).toBe('note\r\n"a,""b""\nc"');
  });

  it('emits only the header when there are no rows', () => {
    expect(toCsv([], ['a', 'b'])).toBe('a,b');
  });
});
