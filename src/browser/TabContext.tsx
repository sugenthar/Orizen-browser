import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type WebView from 'react-native-webview';
import { closedTabPolicy } from '../privacy/privacyMode';
import { loadSettings, readRaw, writeRaw } from '../storage/settingsStore';
import type { BrowserTab, ClosedTab, TabMode } from '../types';
import { NEWTAB_URL } from '../types';
import { newId } from '../utils/helpers';
import { buildTabSnapshot, parseTabSnapshot } from './tabSnapshot';

/** Hard cap so the tab strip and memory stay usable on mid-range devices. */
export const MAX_TABS = 20;

interface TabsValue {
  tabs: BrowserTab[];
  normalTabs: BrowserTab[];
  privateTabs: BrowserTab[];
  activeTabId: string;
  activeTab: BrowserTab;
  tabCount: number;
  privateTabCount: number;
  recentlyClosed: ClosedTab[];
  /** Returns the new tab id, or null when the tab cap is reached. */
  createTab: (url?: string, switchTo?: boolean, mode?: TabMode) => string | null;
  createPrivateTab: (switchTo?: boolean) => string | null;
  closeTab: (id: string) => void;
  closeAllTabs: (mode?: TabMode) => void;
  switchTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<BrowserTab>) => void;
  navigateActive: (url: string, title?: string) => void;
  reopenClosedTab: () => string | null;
  restoreClosedTab: (id: string) => string | null;
  clearRecentlyClosed: () => void;
  registerWebView: (id: string, ref: WebView | null) => void;
  /** Run JS in the active tab's WebView. Used for Find in Page (term never persisted). */
  injectIntoActive: (script: string) => void;
  /** Clear the native WebView resource cache for all mounted tabs. */
  clearWebViewCache: () => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stopLoading: () => void;
}

const TabsContext = createContext<TabsValue | null>(null);

function makeTab(url: string = NEWTAB_URL, title = 'New tab', mode: TabMode = 'normal'): BrowserTab {
  const now = Date.now();
  return {
    id: newId('tab'),
    mode,
    url,
    title,
    loading: false,
    progress: 0,
    canGoBack: false,
    canGoForward: false,
    error: null,
    createdAt: now,
    lastActiveAt: now,
  };
}

const SNAPSHOT_KEY = 'orizen.tabs.snapshot.v1';

/**
 * Startup tabs: restores normal tabs only when the user explicitly enabled
 * restoration. Private tabs are never restored; search pages, new-tab pages
 * and malformed entries are dropped by parseTabSnapshot.
 */
function initialTabs(): BrowserTab[] {
  try {
    if (!loadSettings().restoreTabs) return [makeTab()];
    const raw = readRaw(SNAPSHOT_KEY);
    if (!raw) return [makeTab()];
    const entries = parseTabSnapshot(JSON.parse(raw) as unknown);
    if (entries.length === 0) return [makeTab()];
    return entries.map((e) => makeTab(e.url, e.title || e.url, 'normal'));
  } catch {
    return [makeTab()];
  }
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<BrowserTab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]!.id);
  const [recentlyClosed, setRecentlyClosed] = useState<ClosedTab[]>([]);
  const webViews = useRef(new Map<string, WebView>());
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const recentlyClosedRef = useRef(recentlyClosed);
  recentlyClosedRef.current = recentlyClosed;

  // Persist a restorable snapshot whenever tab identity changes (id/url/
  // title/mode only — progress and loading state are excluded so progress
  // ticks do not cause storage writes). Private tabs and search pages are
  // filtered by buildTabSnapshot.
  const snapshotSignature = useMemo(
    () => tabs.map((t) => `${t.id}|${t.mode}|${t.url}|${t.title}`).join('\n'),
    [tabs],
  );
  useEffect(() => {
    try {
      writeRaw(SNAPSHOT_KEY, JSON.stringify(buildTabSnapshot(tabsRef.current)));
    } catch {
      // snapshot persistence must never break browsing
    }
  }, [snapshotSignature]);

  const createTab = useCallback(
    (url: string = NEWTAB_URL, switchTo = true, mode: TabMode = 'normal') => {
      if (tabsRef.current.length >= MAX_TABS) return null;
      const tab = makeTab(url, url === NEWTAB_URL ? (mode === 'private' ? 'Private tab' : 'New tab') : url, mode);
      setTabs((prev) => (prev.length >= MAX_TABS ? prev : [...prev, tab]));
      if (switchTo) {
        setActiveTabId(tab.id);
        tab.lastActiveAt = Date.now();
      }
      return tab.id;
    },
    [],
  );

  const createPrivateTab = useCallback((switchTo = true) => createTab(NEWTAB_URL, switchTo, 'private'), [createTab]);

  const closeTab = useCallback(
    (id: string) => {
      webViews.current.delete(id);
      const prev = tabsRef.current;
      const closing = prev.find((t) => t.id === id);
      if (!closing) return;
      const mode = closing.mode;
      if (prev.length <= 1) {
        // Never leave zero tabs: reset the last one to a fresh tab of the same mode.
        setTabs([makeTab(NEWTAB_URL, mode === 'private' ? 'Private tab' : 'New tab', mode)]);
        return;
      }
      // Private tabs and start pages never enter recently-closed (see
      // closedTabPolicy): restoring one would persist what the user dropped.
      if (closedTabPolicy(mode, closing.url) === 'keep') {
        const entry: ClosedTab = { id: newId('closed'), url: closing.url, title: closing.title, closedAt: Date.now() };
        setRecentlyClosed((rc) => [entry, ...rc].slice(0, 10));
      }
      const next = prev.filter((t) => t.id !== id);
      setTabs(next);
      if (id === activeTabId) {
        const idx = prev.findIndex((t) => t.id === id);
        const fallback = next[Math.max(0, idx - 1)] ?? next[0]!;
        setActiveTabId(fallback.id);
      }
    },
    [activeTabId],
  );

  const closeAllTabs = useCallback(
    (mode?: TabMode) => {
      const prev = tabsRef.current;
      const doomed = mode ? prev.filter((t) => t.mode === mode) : prev;
      for (const t of doomed) webViews.current.delete(t.id);
      if (!mode) {
        const closable = prev
          .filter((t) => closedTabPolicy(t.mode, t.url) === 'keep')
          .map((t) => ({ id: newId('closed'), url: t.url, title: t.title, closedAt: Date.now() }));
        if (closable.length > 0) setRecentlyClosed((rc) => [...closable, ...rc].slice(0, 10));
      }
      const kept = mode ? prev.filter((t) => t.mode !== mode) : [];
      if (kept.length > 0) {
        setTabs(kept);
        if (!kept.some((t) => t.id === activeTabId)) setActiveTabId(kept[0]!.id);
        return;
      }
      const fresh = makeTab(NEWTAB_URL, mode === 'private' ? 'Private tab' : 'New tab', mode ?? 'normal');
      setTabs([fresh]);
      setActiveTabId(fresh.id);
    },
    [activeTabId],
  );

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id);
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, lastActiveAt: Date.now() } : t)));
  }, []);

  const updateTab = useCallback((id: string, patch: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const navigateActive = useCallback(
    (url: string, title?: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, url, title: title ?? t.title, error: null, loading: true, progress: 0 }
            : t,
        ),
      );
    },
    [activeTabId],
  );

  const reopenClosedTab = useCallback(() => {
    let restored: ClosedTab | null = null;
    setRecentlyClosed((prev) => {
      if (prev.length === 0) return prev;
      restored = prev[0]!;
      return prev.slice(1);
    });
    if (!restored) return null;
    const c = restored as ClosedTab;
    return createTab(c.url, true, 'normal');
  }, [createTab]);

  const restoreClosedTab = useCallback(
    (id: string) => {
      const entry = recentlyClosedRef.current.find((c) => c.id === id);
      if (!entry) return null;
      setRecentlyClosed((prev) => prev.filter((c) => c.id !== id));
      return createTab(entry.url, true, 'normal');
    },
    [createTab],
  );

  const clearRecentlyClosed = useCallback(() => setRecentlyClosed([]), []);

  const registerWebView = useCallback((id: string, ref: WebView | null) => {
    if (ref) webViews.current.set(id, ref);
    else webViews.current.delete(id);
  }, []);

  const goBack = useCallback(() => webViews.current.get(activeTabId)?.goBack(), [activeTabId]);
  const goForward = useCallback(() => webViews.current.get(activeTabId)?.goForward(), [activeTabId]);
  const reload = useCallback(() => webViews.current.get(activeTabId)?.reload(), [activeTabId]);
  const stopLoading = useCallback(() => webViews.current.get(activeTabId)?.stopLoading(), [activeTabId]);

  const injectIntoActive = useCallback(
    (script: string) => {
      try {
        webViews.current.get(activeTabId)?.injectJavaScript(script);
      } catch {
        console.warn('[Orizen] Page action unavailable');
      }
    },
    [activeTabId],
  );

  const clearWebViewCache = useCallback(() => {
    for (const ref of webViews.current.values()) {
      try {
        ref.clearCache?.(true);
      } catch {
        // per-WebView failures must not break clearing
      }
    }
  }, []);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? tabs[0]!, [tabs, activeTabId]);
  const normalTabs = useMemo(() => tabs.filter((t) => t.mode === 'normal'), [tabs]);
  const privateTabs = useMemo(() => tabs.filter((t) => t.mode === 'private'), [tabs]);

  const value = useMemo<TabsValue>(
    () => ({
      tabs,
      normalTabs,
      privateTabs,
      activeTabId,
      activeTab,
      tabCount: tabs.length,
      privateTabCount: privateTabs.length,
      recentlyClosed,
      createTab,
      createPrivateTab,
      closeTab,
      closeAllTabs,
      switchTab,
      updateTab,
      navigateActive,
      reopenClosedTab,
      restoreClosedTab,
      clearRecentlyClosed,
      registerWebView,
      injectIntoActive,
      clearWebViewCache,
      goBack,
      goForward,
      reload,
      stopLoading,
    }),
    [tabs, normalTabs, privateTabs, activeTabId, activeTab, recentlyClosed, createTab, createPrivateTab, closeTab, closeAllTabs, switchTab, updateTab, navigateActive, reopenClosedTab, restoreClosedTab, clearRecentlyClosed, registerWebView, injectIntoActive, clearWebViewCache, goBack, goForward, reload, stopLoading],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used within TabsProvider');
  return ctx;
}
