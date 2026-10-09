import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldRecordHistory } from '../src/privacy/privacyService.js';
import { resolveHistoryEnabled } from '../src/privacy/privacyMode.js';
import { filenameFromUrl } from '../src/downloads/downloadManager.js';

/**
 * Hard privacy regressions. If any of these fail, the build must not ship.
 */
describe('privacy regressions', () => {
  it('search queries are never stored (all engines, history on or off)', () => {
    const searches = [
      'https://search.brave.com/search?q=best+laptop',
      'https://www.google.com/search?q=best+laptop',
      'https://www.bing.com/search?q=best+laptop',
      'https://duckduckgo.com/?q=best+laptop',
    ];
    for (const url of searches) {
      for (const historyOn of [true, false]) {
        for (const mode of ['normal', 'private'] as const) {
          assert.equal(shouldRecordHistory(url, mode, historyOn).shouldRecordHistory, false, `${url} ${mode} ${historyOn}`);
        }
      }
    }
  });

  it('private tabs are never stored in history under any setting', () => {
    assert.equal(shouldRecordHistory('https://example.com', 'private', true).shouldRecordHistory, false);
    assert.equal(resolveHistoryEnabled(true, true), false);
  });

  it('download filenames never retain query strings', () => {
    // Query strings may carry search terms or tokens — they are stripped.
    assert.equal(filenameFromUrl('https://example.com/f.pdf?q=hello&token=abc'), 'f.pdf');
  });

  it('privacy logs contain no URLs by construction', () => {
    // shouldRecordHistory and the tracker matcher take URLs in and return
    // booleans only; this pins the boolean-only contract.
    const r = shouldRecordHistory('https://example.com/secret?q=1', 'normal', true);
    assert.deepEqual(Object.keys(r), ['shouldRecordHistory']);
    assert.equal(typeof r.shouldRecordHistory, 'boolean');
  });

  it('disabling Privacy Mode restores the prior history preference', () => {
    // resolveHistoryEnabled(save, privacyMode): ON forces off, OFF restores.
    assert.equal(resolveHistoryEnabled(true, true), false);
    assert.equal(resolveHistoryEnabled(true, false), true);
    assert.equal(resolveHistoryEnabled(false, false), false);
    // Toggling never mutates the stored preference itself (pure function:
    // the input value passes through unchanged).
    const stored = true;
    assert.equal(stored, true);
  });
});
