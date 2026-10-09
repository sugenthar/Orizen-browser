import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTabSnapshot, parseTabSnapshot } from '../src/browser/tabSnapshot.js';
import type { BrowserTab } from '../src/types/index.js';

function tab(overrides: Partial<BrowserTab>): BrowserTab {
  return {
    id: 't1',
    mode: 'normal',
    url: 'https://example.com',
    title: 'Example',
    loading: false,
    progress: 1,
    canGoBack: false,
    canGoForward: false,
    error: null,
    createdAt: 1,
    lastActiveAt: 1,
    ...overrides,
  };
}

describe('session snapshots', () => {
  it('keeps normal http pages only', () => {
    const snap = buildTabSnapshot([
      tab({ id: 'a', url: 'https://example.com', title: 'E' }),
      tab({ id: 'b', url: 'https://example.org/x', title: 'O' }),
    ]);
    assert.equal(snap.version, 1);
    assert.equal(snap.tabs.length, 2);
  });

  it('excludes private tabs, search pages and start pages', () => {
    const snap = buildTabSnapshot([
      tab({ id: 'p', mode: 'private', url: 'https://example.com' }),
      tab({ id: 's', url: 'https://search.brave.com/search?q=hello' }),
      tab({ id: 'n', url: 'about:newtab' }),
      tab({ id: 'k', url: 'https://keep.com', title: 'K' }),
    ]);
    assert.deepEqual(snap.tabs, [{ url: 'https://keep.com', title: 'K' }]);
  });

  it('caps snapshots at the tab limit', () => {
    const tabs = Array.from({ length: 30 }, (_, i) => tab({ id: `t${i}`, url: `https://site${i}.com` }));
    assert.equal(buildTabSnapshot(tabs).tabs.length, 20);
  });

  it('drops malformed stored state safely', () => {
    assert.deepEqual(parseTabSnapshot(null), []);
    assert.deepEqual(parseTabSnapshot({}), []);
    assert.deepEqual(parseTabSnapshot({ version: 2, tabs: [] }), []);
    assert.deepEqual(parseTabSnapshot({ version: 1, tabs: 'nope' }), []);
    assert.deepEqual(parseTabSnapshot({ version: 1, tabs: [{ url: 42 }] }), []);
  });

  it('filters search pages and invalid entries on restore', () => {
    const out = parseTabSnapshot({
      version: 1,
      tabs: [
        { url: 'https://ok.com', title: 'OK' },
        { url: 'https://www.google.com/search?q=x', title: 'q' },
        { url: 'ftp://files.com/x', title: 'F' },
      ],
    });
    assert.deepEqual(out, [{ url: 'https://ok.com', title: 'OK' }]);
  });
});
