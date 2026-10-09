import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_MOUNTED_WEBVIEWS, selectMountedIds, shouldReportProgress } from '../src/browser/tabPerformance.js';

describe('LRU WebView mounting', () => {
  const tabs = [
    { id: 'a', lastActiveAt: 100 },
    { id: 'b', lastActiveAt: 300 },
    { id: 'c', lastActiveAt: 200 },
  ];

  it('always mounts the active tab', () => {
    const ids = selectMountedIds(tabs, 'a', 1);
    assert.ok(ids.has('a'));
  });

  it('prefers most-recently-used tabs within the cap', () => {
    const ids = selectMountedIds(tabs, 'a', 2);
    assert.ok(ids.has('a'));
    assert.ok(ids.has('b'));
    assert.ok(!ids.has('c'));
  });

  it('never exceeds the mount cap', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, lastActiveAt: i }));
    assert.ok(selectMountedIds(many, 't0').size <= MAX_MOUNTED_WEBVIEWS);
  });
});

describe('progress update throttling', () => {
  it('reports first progress and completion', () => {
    assert.equal(shouldReportProgress(0, 0.01), true);
    assert.equal(shouldReportProgress(0.9, 1), true);
  });

  it('skips insignificant deltas', () => {
    assert.equal(shouldReportProgress(0.5, 0.51), false);
    assert.equal(shouldReportProgress(0.5, 0.6), true);
  });
});
