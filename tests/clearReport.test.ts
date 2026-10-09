import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeClearResults } from '../src/privacy/clearReport.js';

describe('clear-data outcome reporting', () => {
  it('reports full success honestly', () => {
    const r = summarizeClearResults(['history', 'cache', 'cookies'], { history: true, cache: true, cookies: true });
    assert.equal(r.allSucceeded, true);
    assert.ok(r.message.includes('cleared'));
  });

  it('never claims success for failed categories', () => {
    const r = summarizeClearResults(['history', 'cookies'], { history: true, cookies: false });
    assert.equal(r.allSucceeded, false);
    assert.ok(r.message.includes('Browsing history'));
    assert.ok(r.message.includes('could not be cleared'));
    assert.ok(!r.message.startsWith('Browsing history cleared,'));
  });

  it('reports total failure', () => {
    const r = summarizeClearResults(['cookies'], { cookies: false });
    assert.equal(r.allSucceeded, false);
    assert.ok(r.message.includes('Cookies'));
  });

  it('handles empty selection', () => {
    const r = summarizeClearResults([], {});
    assert.equal(r.allSucceeded, true);
    assert.equal(r.message, 'Nothing selected');
  });
});
