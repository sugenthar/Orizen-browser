import { isSearchResultsUrl } from '../search/searchService';
import type { BrowserTab, TabMode } from '../types';

/**
 * Central privacy policy for Orizen Browser.
 *
 * Guarantees:
 * - Search queries are NEVER persisted (SQLite, MMKV, files — nowhere).
 * - Browsing history is opt-in (default OFF) and normal tabs only.
 * - Private tabs never produce persistent records of any kind.
 *
 * All recording decisions must go through shouldRecordHistory().
 * Do not scatter privacy checks across screens.
 */

export const PRIVATE_BROWSING_MESSAGE =
  'Orizen won\u2019t save your browsing history or searches from this session.';

export const PRIVATE_BROWSING_DISCLAIMER =
  'Your activity may still be visible to websites you visit, your network administrator, or your internet provider. Private browsing does not make you anonymous.';

export const SEARCH_NEVER_SAVED_NOTE = 'Search history · Never saved';

export function isPrivateMode(mode: TabMode): boolean {
  return mode === 'private';
}

export function isPrivateTab(tab: Pick<BrowserTab, 'mode'>): boolean {
  return tab.mode === 'private';
}

export interface HistoryPolicy {
  /** Normal tab AND user explicitly enabled history AND URL is a plain page (never a search). */
  shouldRecordHistory: boolean;
}

export function shouldRecordHistory(url: string, mode: TabMode, saveBrowsingHistory: boolean): HistoryPolicy {
  if (mode === 'private') return { shouldRecordHistory: false };
  if (!saveBrowsingHistory) return { shouldRecordHistory: false };
  if (!url || !/^https?:\/\//i.test(url.trim())) return { shouldRecordHistory: false };
  if (isSearchResultsUrl(url)) return { shouldRecordHistory: false };
  return { shouldRecordHistory: true };
}

/** Explicit bookmarks are intentional user actions, allowed from any tab mode. */
export function canCreateBookmarkFrom(_mode: TabMode): boolean {
  return true;
}

export interface PrivacyCapabilities {
  canClearHistory: boolean;
  canClearWebViewCache: boolean;
  canClearCookies: boolean;
  canClearSiteData: boolean;
  cookieNote: string;
}

/**
 * Only advertises clearing that actually works. DOM site data beyond cookies
 * is owned by the OS WebView stores without a bundled purge module — so it
 * reports false instead of pretending. Cookies clear via the native cookie
 * module (see siteData.ts; development build required).
 */
export function getPrivacyCapabilities(): PrivacyCapabilities {
  return {
    canClearHistory: true,
    canClearWebViewCache: true,
    // True since v0.5.0: the native cookie module clears the shared store.
    // Requires a development build; failures are reported, never hidden.
    canClearCookies: true,
    canClearSiteData: false,
    cookieNote:
      'Cookies are cleared through the native cookie module (development build required). Per-page DOM storage such as localStorage lives inside each WebView; private tabs run with storage disabled and ephemeral sessions.',
  };
}
