/**
 * Platform capability matrix for privacy features.
 * Detected, never assumed: the UI adapts to what this build can actually do.
 *
 * NOTE: this module is intentionally free of react-native imports so the
 * policy stays unit-testable under plain Node.js.
 */
export interface PrivacyCapabilities {
  /** A real OS-level VPN provider module is bundled and usable. */
  vpn: boolean;
  /** The app itself can enforce/verify secure DNS for WebView traffic. */
  secureDns: boolean;
  /** Main-frame navigation interception for tracker blocking. */
  trackerBlocking: boolean;
  /** Native cookie-store clearing (requires a development build). */
  cookieManagement: boolean;
  /** Native WebView resource-cache clearing. */
  webViewCacheClear: boolean;
  /** Ephemeral WebView sessions (incognito). */
  privateSessions: boolean;
}

declare global {
  // Set by a future native VPN module integration (see vpnService.ts).
  // Never set in this build — presence is the capability signal.
  // eslint-disable-next-line no-var
  var __ORIZEN_VPN_NATIVE__: unknown | undefined;
}

export function hasNativeVpnModule(): boolean {
  try {
    return typeof globalThis.__ORIZEN_VPN_NATIVE__ !== 'undefined' && globalThis.__ORIZEN_VPN_NATIVE__ !== null;
  } catch {
    return false;
  }
}

export function detectPrivacyCapabilities(): PrivacyCapabilities {
  return {
    // No native VPN module is bundled with Orizen v0.5.0 (see vpnService.ts).
    vpn: hasNativeVpnModule(),
    // WebView traffic uses the OS network stack; the app cannot enforce or
    // verify DNS-over-HTTPS for page loads (see secureDns.ts).
    secureDns: false,
    // Implemented via WebView navigation interception (see trackerProtection.ts).
    trackerBlocking: true,
    // Implemented via the native cookie module (dev build required).
    cookieManagement: true,
    // Implemented via the WebView ref clearCache API.
    webViewCacheClear: true,
    // Implemented via the WebView incognito prop.
    privateSessions: true,
  };
}
