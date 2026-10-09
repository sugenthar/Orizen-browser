import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Route-registration regression tests (structural, not runtime rendering:
 * importing .tsx routes in plain Node is impossible because they depend on
 * react-native. These pin the exact failure mode seen in v0.5.0, where a
 * crashing transitive import made the settings route disappear).
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(root, p), 'utf-8');

function declaredScreens(): string[] {
  const layout = read('app/_layout.tsx');
  return [...layout.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map((m) => m[1] as string);
}

describe('expo router registration', () => {
  it('settings.tsx exports a valid default component', () => {
    const src = read('app/settings.tsx');
    assert.match(src, /export default function \w+\(\)/);
  });

  it('every route file has a default export', () => {
    for (const name of ['index', 'settings', 'bookmarks', 'downloads', 'history', 'permissions', 'privacy']) {
      const src = read(`app/${name}.tsx`);
      assert.match(src, /export default function/, `${name} is missing a default export`);
    }
  });

  it('layout-declared screens match existing route files', () => {
    const screens = declaredScreens();
    assert.ok(screens.includes('settings'), 'settings must stay registered');
    for (const name of screens) {
      assert.doesNotThrow(() => read(`app/${name}.tsx`), `no route file for declared screen "${name}"`);
    }
  });

  it('no duplicate screen declarations', () => {
    const screens = declaredScreens();
    assert.equal(new Set(screens).size, screens.length);
  });

  it('settings route has no module-scope native crash risk', () => {
    // The v0.5.0 defect: a static native import crashed route evaluation.
    // siteData (imported by settings) must not statically import the cookie
    // package — it lazy-loads it inside a guarded loader instead.
    const siteData = read('src/privacy/siteData.ts');
    assert.ok(!/^import .*cookie-manager/m.test(siteData), 'static cookie import would crash route evaluation');
    assert.ok(siteData.includes('loadCookieModule'), 'guarded loader must exist');
  });
});
