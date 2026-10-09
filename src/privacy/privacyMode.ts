import type { DNSStatus } from './secureDns';
import type { VPNStatus } from './vpnService';

/**
 * Authoritative privacy state. The UI consumes resolvePrivacyStatus() instead
 * of combining flags itself, so every screen reports the same truth.
 */
export interface PrivacyStatus {
  /** Global Privacy Mode toggle. */
  privacyMode: boolean;
  /** The active tab is a private tab. */
  privateBrowsing: boolean;
  /** Effective history recording (Privacy Mode forces OFF). */
  historyEnabled: boolean;
  /** Search history is never stored — a literal type, not just a value. */
  searchHistoryStored: false;
  /** Effective tracker protection (Privacy Mode forces ON). */
  trackerProtection: boolean;
  vpnStatus: VPNStatus;
  secureDnsStatus: DNSStatus;
  /** Partial hardening only (no identifiers, minimal injection) — never 'full'. */
  fingerprintProtection: 'limited';
}

export interface PrivacyStatusInput {
  privacyMode: boolean;
  saveBrowsingHistory: boolean;
  trackerProtectionEnabled: boolean;
  tabIsPrivate: boolean;
  vpnStatus: VPNStatus;
  dnsStatus: DNSStatus;
}

export function resolvePrivacyStatus(input: PrivacyStatusInput): PrivacyStatus {
  return {
    privacyMode: input.privacyMode,
    privateBrowsing: input.tabIsPrivate,
    historyEnabled: input.saveBrowsingHistory && !input.privacyMode,
    searchHistoryStored: false,
    trackerProtection: input.privacyMode || input.trackerProtectionEnabled,
    vpnStatus: input.vpnStatus,
    secureDnsStatus: input.dnsStatus,
    fingerprintProtection: 'limited',
  };
}

/** Effective history flag shared by recording, recents and the History screen. */
export function resolveHistoryEnabled(saveBrowsingHistory: boolean, privacyMode: boolean): boolean {
  return saveBrowsingHistory && !privacyMode;
}

/**
 * Recently-closed policy (single source): normal tabs with real pages are
 * restorable tab state; private tabs and start pages never are.
 */
export function closedTabPolicy(mode: 'normal' | 'private', url: string): 'keep' | 'drop' {
  if (mode === 'private') return 'drop';
  const u = url.trim().toLowerCase();
  if (u === '' || u === 'about:newtab' || u === 'about:blank' || u === 'orizen://newtab') return 'drop';
  return 'keep';
}
