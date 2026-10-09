export type ThemeMode = 'light' | 'dark' | 'system';

export type SearchEngineId = 'brave' | 'google' | 'bing' | 'duckduckgo';

export interface SearchEngine {
  id: SearchEngineId;
  name: string;
  searchUrl: string; // must contain %s placeholder for encoded query
  homepage: string;
}

export type TabMode = 'normal' | 'private';

export interface BrowserTab {
  id: string;
  mode: TabMode;
  url: string;
  title: string;
  loading: boolean;
  progress: number;
  canGoBack: boolean;
  canGoForward: boolean;
  error: string | null;
  createdAt: number;
  lastActiveAt: number;
}

export function isPrivateTab(tab: Pick<BrowserTab, 'mode'>): boolean {
  return tab.mode === 'private';
}

export interface ClosedTab {
  id: string;
  url: string;
  title: string;
  closedAt: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  createdAt: number;
  folder: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  url: string;
  visitedAt: number;
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface BrowserSettings {
  defaultSearchEngine: SearchEngineId;
  homepage: string;
  openLinksInNewTab: boolean;
  themeMode: ThemeMode;
  javaScriptEnabled: boolean;
  cookiesEnabled: boolean;
  domStorageEnabled: boolean;
  blockPopups: boolean;
  /** Privacy-first default: OFF. When false, visited pages are never written to SQLite. */
  saveBrowsingHistory: boolean;
  /** Global Privacy Mode: forces history off + tracker protection on. Default OFF. */
  privacyMode: boolean;
  /** Browser-level tracker blocking. Default ON; Privacy Mode forces it on. */
  trackerProtectionEnabled: boolean;
  /** Prefer secure DNS where the platform allows. Default ON (effective state is detected, never assumed). */
  secureDnsEnabled: boolean;
  /** Never auto-connect a VPN unless a legitimate provider is configured. Default OFF. */
  autoConnectVpn: boolean;
  /** Restore normal tabs on startup. Default OFF. Private tabs are never restored. */
  restoreTabs: boolean;
}

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  mimeType?: string;
  contentLength?: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  createdAt: number;
}

/**
 * Persistent download metadata (v0.3).
 * Privacy by schema: no source-URL column exists, so a download can never
 * become browsing history. Filenames/sizes are explicit user-download records.
 */
export interface DownloadRecord {
  id: string;
  filename: string;
  fileUri: string;
  mimeType: string | null;
  size: number;
  status: DownloadStatus;
  fromPrivate: boolean;
  createdAt: number;
  completedAt: number | null;
}

export interface SitePermissionRecord {
  origin: string;
  permission: string;
  decision: 'allow' | 'block';
  updatedAt: number;
}

export type TaskPriority = 'low' | 'normal' | 'high';

export interface TaskList {
  id: string;
  name: string;
  createdAt: number;
}

export interface TaskRecord {
  id: string;
  title: string;
  notes: string;
  /** Optional due date as YYYY-MM-DD, or null. */
  dueDate: string | null;
  priority: TaskPriority;
  /** Custom list id, or null for unlisted tasks. */
  listId: string | null;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_HOMEPAGE = 'about:newtab';
export const NEWTAB_URL = 'about:newtab';

export function isNewTabUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  const u = url.trim().toLowerCase();
  return u === '' || u === 'about:newtab' || u === 'about:blank' || u === 'orizen://newtab';
}
