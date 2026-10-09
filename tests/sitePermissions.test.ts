import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultDecision,
  describeDecision,
  isEnforceablePerSite,
  normalizeOrigin,
} from '../src/permissions/sitePermissions.js';

describe('site origin normalization', () => {
  it('lowercases scheme and host, keeps ports', () => {
    assert.equal(normalizeOrigin('HTTPS://Example.COM:8443/a?x=1'), 'https://example.com:8443');
    assert.equal(normalizeOrigin('http://example.com'), 'http://example.com');
  });

  it('distinguishes schemes, ports and hostnames', () => {
    assert.notEqual(normalizeOrigin('http://example.com'), normalizeOrigin('https://example.com'));
    assert.notEqual(normalizeOrigin('https://example.com'), normalizeOrigin('https://example.com:8443'));
    assert.notEqual(normalizeOrigin('https://a.example.com'), normalizeOrigin('https://example.com'));
    // Default ports normalize to the same origin (correct: they are identical).
    assert.equal(normalizeOrigin('https://example.com:443'), normalizeOrigin('https://example.com'));
  });

  it('rejects non-http origins and garbage', () => {
    assert.equal(normalizeOrigin('mailto:a@b.com'), null);
    assert.equal(normalizeOrigin('about:newtab'), null);
    assert.equal(normalizeOrigin('not a url'), null);
    assert.equal(normalizeOrigin(''), null);
  });
});

describe('permission defaults and enforcement', () => {
  it('unknown sites default to ask, location defaults to block', () => {
    assert.equal(defaultDecision('camera'), 'ask');
    assert.equal(defaultDecision('microphone'), 'ask');
    assert.equal(defaultDecision('location'), 'block');
    assert.equal(defaultDecision('notifications'), 'ask');
  });

  it('only tracker exceptions are per-site enforceable', () => {
    assert.equal(isEnforceablePerSite('tracker'), true);
    assert.equal(isEnforceablePerSite('camera'), false);
    assert.equal(isEnforceablePerSite('microphone'), false);
    assert.equal(isEnforceablePerSite('location'), false);
    assert.equal(isEnforceablePerSite('notifications'), false);
    assert.equal(isEnforceablePerSite('fileUpload'), false);
  });

  it('describes decisions plainly', () => {
    assert.equal(describeDecision('ask'), 'Ask every time');
    assert.equal(describeDecision('allow'), 'Allowed');
    assert.equal(describeDecision('block'), 'Blocked');
  });
});
