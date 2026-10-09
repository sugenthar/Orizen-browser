import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearCookiesWith,
  COOKIE_REBUILD_REQUIRED,
  isCookieModuleAvailable,
  type CookieNativeModule,
} from '../src/privacy/siteData.js';

/**
 * Cookie-adapter safety: importing the adapter must never crash, and an
 * unavailable native module must produce a structured failure — never a
 * fake success and never an uncaught exception.
 */
describe('cookie adapter without native module', () => {
  it('importing the adapter is side-effect free', () => {
    // If this file loaded, the import did not throw.
    assert.ok(true);
  });

  it('reports availability as a boolean without throwing', () => {
    assert.equal(typeof isCookieModuleAvailable(), 'boolean');
  });

  it('returns rebuild guidance when the module is missing', async () => {
    const r = await clearCookiesWith(null);
    assert.equal(r.cleared, false);
    assert.equal(r.error, COOKIE_REBUILD_REQUIRED);
  });

  it('treats a module without clearAll as unavailable', async () => {
    const r = await clearCookiesWith({} as unknown as CookieNativeModule);
    assert.equal(r.cleared, false);
    assert.ok(typeof r.error === 'string' && r.error.length > 0);
  });
});

describe('cookie adapter with native module', () => {
  it('reports real success only after native execution', async () => {
    let called = 0;
    const r = await clearCookiesWith({
      clearAll: async (useWebKit: boolean) => {
        called += 1;
        assert.equal(useWebKit, true);
        return true;
      },
    });
    assert.equal(called, 1);
    assert.deepEqual(r, { cleared: true, error: null });
  });

  it('reports a declined store as failure, not success', async () => {
    const r = await clearCookiesWith({ clearAll: async () => false });
    assert.equal(r.cleared, false);
    assert.ok(typeof r.error === 'string' && r.error.length > 0);
  });

  it('propagates native errors into structured results', async () => {
    const r = await clearCookiesWith({
      clearAll: async () => {
        throw new Error('native boom');
      },
    });
    assert.equal(r.cleared, false);
    assert.equal(r.error, 'native boom');
  });
});
