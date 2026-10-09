/**
 * Native website-data operations behind a capability-safe boundary.
 *
 * The cookie module ships native (TurboModule) code that only exists in a
 * development build created AFTER the package was installed. Importing it at
 * module scope crashes the whole app (and every route importing this file)
 * when the binary lacks it — so the native module is loaded LAZILY inside a
 * guarded loader. Importing this file is always side-effect free.
 *
 * Every function reports its REAL outcome. A missing native module returns a
 * structured failure telling the user a rebuild is required — never a fake
 * success, and never an uncaught exception.
 */

export type SiteDataOutcome = { cleared: boolean; error: string | null };

export const COOKIE_REBUILD_REQUIRED =
  'Cookie clearing needs a development build that includes the cookie module. Rebuild and reinstall the app, then try again.';

export interface CookieNativeModule {
  clearAll: (useWebKit: boolean) => Promise<boolean>;
}

function loadCookieModule(): CookieNativeModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@preeternal/react-native-cookie-manager') as {
      default?: { clearAll?: unknown };
      clearAll?: unknown;
    };
    const candidate = (mod?.default ?? mod) as { clearAll?: unknown } | null;
    if (!candidate || typeof candidate.clearAll !== 'function') return null;
    return candidate as CookieNativeModule;
  } catch {
    // Native module (or its JS wrapper) is unavailable in this binary.
    return null;
  }
}

/** True only when the native cookie module can actually be called. */
export function isCookieModuleAvailable(): boolean {
  return loadCookieModule() !== null;
}

/**
 * Testable core: runs clearing against an injected module (or null for the
 * unavailable path). Production code must use clearCookiesNative().
 */
export async function clearCookiesWith(native: CookieNativeModule | null): Promise<SiteDataOutcome> {
  if (!native) {
    return { cleared: false, error: COOKIE_REBUILD_REQUIRED };
  }
  try {
    // `true` selects the WebKit store on iOS; on Android the flag is ignored
    // and the shared store is cleared (per the library's API contract).
    const ok = await native.clearAll(true);
    if (ok) return { cleared: true, error: null };
    return { cleared: false, error: 'The system cookie store declined the request.' };
  } catch (e) {
    return { cleared: false, error: e instanceof Error ? e.message : 'Cookie clearing failed unexpectedly.' };
  }
}

/**
 * Clear all cookies (Android CookieManager / iOS WKWebView + Foundation
 * stores). Never throws and never reports success without native execution.
 */
export async function clearCookiesNative(): Promise<SiteDataOutcome> {
  return clearCookiesWith(loadCookieModule());
}

/** Best-effort session-cookie removal (used by private-session cleanup). */
export async function clearSessionCookiesNative(): Promise<SiteDataOutcome> {
  return clearCookiesWith(loadCookieModule());
}
