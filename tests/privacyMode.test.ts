import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { closedTabPolicy, resolveHistoryEnabled, resolvePrivacyStatus } from '../src/privacy/privacyMode.js';
import { dnsStatusLabel, getSecureDnsStatus } from '../src/privacy/secureDns.js';
import { detectPrivacyCapabilities } from '../src/privacy/privacyCapabilities.js';

describe('privacy mode resolution', () => {
  const base = {
    saveBrowsingHistory: false,
    trackerProtectionEnabled: true,
    tabIsPrivate: false,
    vpnStatus: 'unsupported' as const,
    dnsStatus: 'system' as const,
  };

  it('privacy ON forces history off and trackers on', () => {
    const s = resolvePrivacyStatus({ ...base, privacyMode: true, saveBrowsingHistory: true, trackerProtectionEnabled: false });
    assert.equal(s.historyEnabled, false);
    assert.equal(s.trackerProtection, true);
    assert.equal(s.searchHistoryStored, false);
  });

  it('privacy OFF restores the user history setting', () => {
    const on = resolvePrivacyStatus({ ...base, privacyMode: false, saveBrowsingHistory: true });
    assert.equal(on.historyEnabled, true);
    const off = resolvePrivacyStatus({ ...base, privacyMode: false, saveBrowsingHistory: false });
    assert.equal(off.historyEnabled, false);
  });

  it('fingerprint protection is honestly limited', () => {
    const s = resolvePrivacyStatus({ ...base, privacyMode: true });
    assert.equal(s.fingerprintProtection, 'limited');
  });

  it('resolveHistoryEnabled matches the status object', () => {
    assert.equal(resolveHistoryEnabled(true, true), false);
    assert.equal(resolveHistoryEnabled(true, false), true);
    assert.equal(resolveHistoryEnabled(false, false), false);
  });
});

describe('recently-closed policy (single source)', () => {
  it('keeps normal tabs with real pages', () => {
    assert.equal(closedTabPolicy('normal', 'https://example.com'), 'keep');
  });
  it('drops private tabs always', () => {
    assert.equal(closedTabPolicy('private', 'https://example.com'), 'drop');
  });
  it('drops start pages', () => {
    assert.equal(closedTabPolicy('normal', 'about:newtab'), 'drop');
    assert.equal(closedTabPolicy('normal', ''), 'drop');
  });
});

describe('secure DNS honesty', () => {
  it('never reports verified active state', () => {
    assert.notEqual(getSecureDnsStatus(true), 'active');
    assert.equal(getSecureDnsStatus(true), 'system');
    assert.equal(getSecureDnsStatus(false), 'disabled');
    assert.equal(dnsStatusLabel('system'), 'System Default');
  });
});

describe('capability detection', () => {
  it('advertises only what this build implements', () => {
    const caps = detectPrivacyCapabilities();
    assert.equal(caps.vpn, false);
    assert.equal(caps.secureDns, false);
    assert.equal(caps.trackerBlocking, true);
    assert.equal(caps.cookieManagement, true);
    assert.equal(caps.webViewCacheClear, true);
    assert.equal(caps.privateSessions, true);
  });
});
