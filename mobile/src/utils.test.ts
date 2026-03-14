import { describe, it, expect } from 'vitest';
import { resolveAuthorFromUrl, parseShareParams } from './utils';

describe('resolveAuthorFromUrl', () => {
  it('returns "github" for github.com URLs', () => {
    expect(resolveAuthorFromUrl('https://github.com/user/repo')).toBe('github');
  });

  it('returns "twitter" for x.com URLs', () => {
    expect(resolveAuthorFromUrl('https://x.com/user/status/123')).toBe('twitter');
  });

  it('returns "twitter" for twitter.com URLs', () => {
    expect(resolveAuthorFromUrl('https://twitter.com/user')).toBe('twitter');
  });

  it('returns "web" for unknown URLs', () => {
    expect(resolveAuthorFromUrl('https://example.com/article')).toBe('web');
  });
});

describe('parseShareParams', () => {
  it('extracts url param from search string', () => {
    const result = parseShareParams('?url=https%3A%2F%2Fexample.com&title=Hello');
    expect(result.url).toBe('https://example.com');
    expect(result.title).toBe('Hello');
  });

  it('extracts text param when url is absent', () => {
    const result = parseShareParams('?text=https%3A%2F%2Fexample.com');
    expect(result.url).toBe('https://example.com');
  });

  it('returns empty strings when no params', () => {
    const result = parseShareParams('');
    expect(result.url).toBe('');
    expect(result.title).toBe('');
  });
});
