/**
 * Secure DNS abstraction.
 *
 * Platform truth: Android WebView / iOS WKWebView resolve through the OS
 * network stack. The app cannot enforce or verify DNS-over-HTTPS for page
 * loads, so this module NEVER reports 'active' from in-app state. It reports
 * what is actually known:
 *  - 'disabled' when the user turned the preference off,
 *  - 'system' when the OS stack applies (e.g. Android Private DNS, if the
 *    user configured it in system settings — Orizen cannot verify it).
 */

export type DNSStatus = 'unsupported' | 'system' | 'disabled' | 'active' | 'error';

export function getSecureDnsStatus(preferenceEnabled: boolean): DNSStatus {
  if (!preferenceEnabled) return 'disabled';
  return 'system';
}

export function dnsStatusLabel(status: DNSStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'system':
      return 'System Default';
    case 'disabled':
      return 'Off';
    case 'error':
      return 'Error';
    default:
      return 'Not Available';
  }
}

export const SECURE_DNS_NOTE =
  'Web pages resolve through the operating system network stack. Orizen cannot verify encrypted DNS for page loads; Android Private DNS in system settings applies if you enabled it there.';
