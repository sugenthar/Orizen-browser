import { isSearchResultsUrl } from '../search/searchService';
import { isNewTabUrl, type BrowserTab } from '../types';

/**
 * Normal-tab session snapshots for optional startup restoration.
 * Privacy rules (enforced here, not just at the call site):
 *  - private tabs are never snapshotted,
 *  - search-result pages are never snapshotted (they would persist queries),
 *  - new-tab pages carry no state worth restoring,
 *  - only http(s) URLs with a valid shape are kept.
 * Malformed or outdated stored state is dropped safely.
 */

export interface TabSnapshot {
  version: 1;
  tabs: Array<{ url: string; title: string }>;
}

export function buildTabSnapshot(tabs: BrowserTab[]): TabSnapshot {
  const kept: Array<{ url: string; title: string }> = [];
  for (const tab of tabs) {
    if (tab.mode !== 'normal') continue;
    if (isNewTabUrl(tab.url)) continue;
    if (!/^https?:\/\//i.test(tab.url.trim())) continue;
    if (isSearchResultsUrl(tab.url)) continue;
    kept.push({ url: tab.url.trim(), title: (tab.title || '').slice(0, 200) });
    if (kept.length >= 20) break;
  }
  return { version: 1, tabs: kept };
}

export function parseTabSnapshot(raw: unknown): Array<{ url: string; title: string }> {
  try {
    if (typeof raw !== 'object' || raw === null) return [];
    const obj = raw as { version?: unknown; tabs?: unknown };
    if (obj.version !== 1 || !Array.isArray(obj.tabs)) return [];
    const out: Array<{ url: string; title: string }> = [];
    for (const entry of obj.tabs) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { url, title } = entry as { url?: unknown; title?: unknown };
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) continue;
      if (isSearchResultsUrl(url)) continue;
      if (typeof title !== 'string') continue;
      out.push({ url: url.trim(), title: title.slice(0, 200) });
      if (out.length >= 20) break;
    }
    return out;
  } catch {
    return [];
  }
}
