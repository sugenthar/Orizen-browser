import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSearchResultsUrl, looksLikeUrl, normalizeUrlForHistory, resolveUserInput } from '../src/search/searchService.js';

describe('search input resolution', () => {
  it('opens https URLs directly', () => {
    const r = resolveUserInput('https://example.com', 'brave');
    assert.equal(r?.kind, 'url');
    assert.equal(r?.url, 'https://example.com');
  });

  it('resolves bare domains to https URLs', () => {
    const r = resolveUserInput('example.com', 'brave');
    assert.equal(r?.kind, 'url');
    assert.equal(r?.url, 'https://example.com');
  });

  it('sends plain text to the default engine', () => {
    const r = resolveUserInput('hello world', 'brave');
    assert.equal(r?.kind, 'search');
    assert.ok(r?.url.startsWith('https://search.brave.com/search?q='));
    assert.ok(r?.url.includes('hello%20world'));
  });

  it('respects the selected engine', () => {
    const r = resolveUserInput('hello', 'duckduckgo');
    assert.ok(r?.url.startsWith('https://duckduckgo.com/?q='));
  });

  it('returns null for empty input', () => {
    assert.equal(resolveUserInput('   ', 'brave'), null);
  });

  it('does not treat spaced text as a URL', () => {
    assert.equal(looksLikeUrl('weather tomorrow'), false);
  });
});

describe('search-result detection (never persist queries)', () => {
  it('detects Brave search pages', () => {
    assert.equal(isSearchResultsUrl('https://search.brave.com/search?q=hello'), true);
  });

  it('detects Google/Bing search pages', () => {
    assert.equal(isSearchResultsUrl('https://www.google.com/search?q=hello'), true);
    assert.equal(isSearchResultsUrl('https://www.bing.com/search?q=hello'), true);
  });

  it('detects DuckDuckGo results but not its homepage', () => {
    assert.equal(isSearchResultsUrl('https://duckduckgo.com/?q=hello'), true);
    assert.equal(isSearchResultsUrl('https://duckduckgo.com'), false);
  });

  it('does not flag ordinary pages', () => {
    assert.equal(isSearchResultsUrl('https://example.com/search?q=x'), false);
    assert.equal(isSearchResultsUrl('https://example.com'), false);
  });

  it('normalizeUrlForHistory drops search pages', () => {
    assert.equal(normalizeUrlForHistory('https://search.brave.com/search?q=hello'), null);
    assert.equal(normalizeUrlForHistory('https://example.com'), 'https://example.com');
  });
});
