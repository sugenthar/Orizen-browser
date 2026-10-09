/**
 * Centralized website-permission model.
 *
 * Enforcement reality (react-native-webview 13.15, verified against native
 * sources — do not extend this list without re-verifying):
 *  - 'tracker' exceptions: ENFORCEABLE per-site via navigation interception.
 *    'allow' stores an exception; deleting it revokes the exception.
 *  - camera/microphone: NOT per-site enforceable. The OS permission dialog
 *    is the gate (Android onPermissionRequest / iOS prompt); Orizen never
 *    auto-grants. Unknown sites therefore default to 'ask'.
 *  - location: BLOCKED globally (WebView geolocation disabled). No per-site
 *    allow is offered because it cannot be enforced.
 *  - notifications: NOT supported inside WebView — reported, not stored.
 *  - file upload: handled by the OS file picker — no decision to store.
 *
 * Only enforceable decisions are persisted. Storing a decision Orizen cannot
 * enforce would mislead the user, so the store refuses other permissions.
 */

export type SitePermissionDecision = 'ask' | 'allow' | 'block';

export type SitePermission =
  | 'tracker'
  | 'camera'
  | 'microphone'
  | 'location'
  | 'notifications'
  | 'fileUpload';

export interface SitePermissionRecord {
  origin: string;
  permission: SitePermission;
  decision: Exclude<SitePermissionDecision, 'ask'>;
  updatedAt: number;
}

/** Permissions with per-site enforcement. Everything else is global-only. */
export const ENFORCEABLE_SITE_PERMISSIONS: readonly SitePermission[] = ['tracker'];

export function isEnforceablePerSite(permission: SitePermission): boolean {
  return (ENFORCEABLE_SITE_PERMISSIONS as readonly string[]).includes(permission);
}

/**
 * Normalize an origin for storage: lowercase scheme://host[:port].
 * Returns null for anything that is not an http(s) origin — different
 * schemes, ports and hostnames must never be confused.
 */
export function normalizeOrigin(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const scheme = parsed.protocol.toLowerCase();
    if (scheme !== 'http:' && scheme !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (!host) return null;
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${scheme}//${host}${port}`;
  } catch {
    return null;
  }
}

/** Default decision for a site with no saved record. Location is blocked. */
export function defaultDecision(permission: SitePermission): SitePermissionDecision {
  if (permission === 'location') return 'block';
  if (permission === 'notifications' || permission === 'fileUpload') return 'ask';
  return 'ask';
}

export function describeDecision(decision: SitePermissionDecision): string {
  switch (decision) {
    case 'allow':
      return 'Allowed';
    case 'block':
      return 'Blocked';
    default:
      return 'Ask every time';
  }
}
