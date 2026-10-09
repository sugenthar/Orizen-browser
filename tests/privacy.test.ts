import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPrivacyCapabilities, shouldRecordHistory } from '../src/privacy/privacyService.js';

describe('history recording policy', () => {
  it('records nothing when history is OFF (default)', () => {
    assert.equal(shouldRecordHistory('https://example.com', 'normal', false).shouldRecordHistory, false);
  });

  it('records plain pages when history is ON', () => {
    assert.equal(shouldRecordHistory('https://example.com', 'normal', true).shouldRecordHistory, true);
  });

  it('never records search-result pages, even with history ON', () => {
    for (const url of [
      'https://search.brave.com/search?q=hello',
      'https://www.google.com/search?q=hello',
      'https://www.bing.com/search?q=hello',
      'https://duckduckgo.com/?q=hello',
    ]) {
      assert.equal(shouldRecordHistory(url, 'normal', true).shouldRecordHistory, false, url);
    }
  });

  it('never records private tabs, even with history ON', () => {
    assert.equal(shouldRecordHistory('https://example.com', 'private', true).shouldRecordHistory, false);
  });

  it('never records non-http URLs', () => {
    assert.equal(shouldRecordHistory('about:newtab', 'normal', true).shouldRecordHistory, false);
  });

  it('capabilities only advertise working clears', () => {
    const caps = getPrivacyCapabilities();
    assert.equal(caps.canClearHistory, true);
    assert.equal(caps.canClearWebViewCache, true);
    assert.equal(caps.canClearCookies, true);
    assert.equal(caps.canClearSiteData, false);
  });
});
