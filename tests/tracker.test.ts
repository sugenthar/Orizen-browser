import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isTrackerUrl, shouldBlockNavigation } from '../src/privacy/trackerProtection.js';

describe('tracker protection', () => {
  it('blocks known tracker hosts', () => {
    assert.equal(shouldBlockNavigation('https://doubleclick.net/clk?id=1', true), true);
    assert.equal(shouldBlockNavigation('https://google-analytics.com/g/collect?v=1', true), true);
  });

  it('blocks tracker subdomains', () => {
    assert.equal(isTrackerUrl('https://stats.hotjar.com/collect'), true);
  });

  it('never blocks normal sites', () => {
    for (const url of ['https://example.com', 'https://news.example.com/article', 'https://search.brave.com/search?q=x']) {
      assert.equal(shouldBlockNavigation(url, true), false, url);
    }
  });

  it('does not confuse similarly-named hosts', () => {
    assert.equal(isTrackerUrl('https://notdoubleclick.net/'), false);
  });

  it('ignores non-http URLs and malformed input', () => {
    assert.equal(shouldBlockNavigation('mailto:a@b.com', true), false);
    assert.equal(shouldBlockNavigation('not a url', true), false);
  });

  it('stays off when the user disables it', () => {
    assert.equal(shouldBlockNavigation('https://doubleclick.net/clk', false), false);
  });

  it('honors explicit per-site exceptions', () => {
    const url = 'https://doubleclick.net/clk?id=1';
    assert.equal(shouldBlockNavigation(url, true, []), true);
    assert.equal(shouldBlockNavigation(url, true, ['https://doubleclick.net']), false);
    // Other origins are unaffected by the exception.
    assert.equal(shouldBlockNavigation('https://google-analytics.com/g/collect', true, ['https://doubleclick.net']), true);
  });
});
