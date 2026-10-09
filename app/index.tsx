import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddressBar } from '../src/components/AddressBar';
import { BottomToolbar } from '../src/components/BottomToolbar';
import { BrowserWebView } from '../src/components/BrowserWebView';
import { FindBar } from '../src/components/FindBar';
import { MenuSheet, type MenuAction } from '../src/components/MenuSheet';
import { NewTabPage } from '../src/components/NewTabPage';
import { PrivateNewTabPage } from '../src/components/PrivateNewTabPage';
import { SecuritySheet } from '../src/components/SecuritySheet';
import { TabsSheet } from '../src/components/TabsSheet';
import { MAX_TABS, useTabs } from '../src/browser/TabContext';
import { buildFindNavScript, buildFindScript, FIND_CLEAR_SCRIPT } from '../src/browser/pageScripts';
import { resolveToolbarMode } from '../src/browser/toolbarState';
import { useDownloads } from '../src/downloads/DownloadContext';
import { useSitePermissions } from '../src/permissions/SitePermissionContext';
import { resolveHistoryEnabled, resolvePrivacyStatus, type PrivacyStatus } from '../src/privacy/privacyMode';
import { isPrivateTab } from '../src/privacy/privacyService';
import { getSecureDnsStatus } from '../src/privacy/secureDns';
import { shouldBlockNavigation } from '../src/privacy/trackerProtection';
import { getVpnService, type VPNStatus } from '../src/privacy/vpnService';
import { useSettings } from '../src/settings/SettingsContext';
import { useTheme } from '../src/theme/ThemeContext';
import { resolveUserInput } from '../src/search/searchService';
import {
  addBookmark,
  addQuickLink,
  getBookmarks,
  getHistory,
  getQuickLinks,
  isBookmarked,
  removeBookmarkByUrl,
  removeQuickLink,
  updateQuickLink,
} from '../src/storage/database';
import { isNewTabUrl, type Bookmark, type HistoryItem, type QuickLink } from '../src/types';

export default function BrowserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const { settings, update: updateSettings } = useSettings();
  const {
    tabs,
    activeTab,
    activeTabId,
    tabCount,
    recentlyClosed,
    createTab,
    createPrivateTab,
    closeTab,
    closeAllTabs,
    switchTab,
    navigateActive,
    reopenClosedTab,
    restoreClosedTab,
    clearRecentlyClosed,
    injectIntoActive,
    goBack,
    goForward,
    reload,
    stopLoading,
  } = useTabs();
  const { notice: downloadNotice } = useDownloads();
  const { trackerExceptions, allowTrackersFor } = useSitePermissions();
  const exceptedOrigins = useMemo(() => trackerExceptions.map((e) => e.origin), [trackerExceptions]);
  // Last blocked tracker URL (transient UI state for the allow-exception flow;
  // never persisted, cleared on navigation or tab switch).
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);

  const [address, setAddress] = useState('');
  const [tabsOpen, setTabsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [bookmarksPreview, setBookmarksPreview] = useState<Bookmark[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Link menu (long-press): transient URL only, never persisted.
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  // Find in page: term lives here only, never persisted.
  const [findOpen, setFindOpen] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [findMatch, setFindMatch] = useState<string | null>(null);
  const findTermRef = useRef('');

  const privateActive = isPrivateTab(activeTab);
  const showingNewTab = isNewTabUrl(activeTab.url) && !activeTab.error;
  // Toolbar mode follows the same tab state that chooses between the
  // homepage view and the WebView — never a URL substring guess.
  // The toolbar is always visible in browser mode (v0.8.1 removed the
  // scroll-hide behavior); only the mode switches with tab state.
  const toolbarMode = resolveToolbarMode(showingNewTab, activeTab.error !== null);
  const historyEffective = resolveHistoryEnabled(settings.saveBrowsingHistory, settings.privacyMode);
  const trackerEffective = settings.privacyMode || settings.trackerProtectionEnabled;
  // Toolbar content (58) + vertical padding (16); safe-area inset is added.
  const toolbarHeight = 74 + insets.bottom;

  // Network protection states: refreshed from the real services, never assumed.
  const [vpnStatus, setVpnStatus] = useState<VPNStatus>('unsupported');
  const refreshNetworkStatus = useCallback(() => {
    void getVpnService()
      .getStatus()
      .then(setVpnStatus)
      .catch(() => setVpnStatus('error'));
  }, []);
  useEffect(() => {
    refreshNetworkStatus();
  }, [refreshNetworkStatus]);

  const privacyStatus: PrivacyStatus = resolvePrivacyStatus({
    privacyMode: settings.privacyMode,
    saveBrowsingHistory: settings.saveBrowsingHistory,
    trackerProtectionEnabled: settings.trackerProtectionEnabled,
    tabIsPrivate: privateActive,
    vpnStatus,
    dnsStatus: getSecureDnsStatus(settings.secureDnsEnabled),
  });

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (downloadNotice) showToast(downloadNotice);
  }, [downloadNotice, showToast]);

  // Keep the address bar in sync with the active tab.
  useEffect(() => {
    setAddress(showingNewTab ? '' : activeTab.url);
  }, [activeTabId, activeTab.url, showingNewTab]);

  const refreshNewTabData = useCallback(async () => {
    try {
      const [ql, b] = await Promise.all([getQuickLinks(), getBookmarks(20)]);
      setQuickLinks(ql);
      setBookmarksPreview(b);
      // Recent list only exists when history is effectively enabled.
      setRecent(historyEffective ? await getHistory(20, 0) : []);
    } catch {
      console.warn('[Orizen] Start page unavailable');
    }
  }, [historyEffective]);

  useEffect(() => {
    if (showingNewTab) void refreshNewTabData();
  }, [showingNewTab, refreshNewTabData]);

  useEffect(() => {
    if (!showingNewTab && /^https?:\/\//i.test(activeTab.url)) {
      void isBookmarked(activeTab.url).then(setBookmarked).catch(() => setBookmarked(false));
    } else {
      setBookmarked(false);
    }
  }, [activeTab.url, showingNewTab]);

  // Android hardware back: sheets/find first, then WebView history.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (findOpen) {
        closeFind();
        return true;
      }
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      if (securityOpen) {
        setSecurityOpen(false);
        return true;
      }
      if (linkUrl) {
        setLinkUrl(null);
        return true;
      }
      if (tabsOpen) {
        setTabsOpen(false);
        return true;
      }
      if (activeTab.canGoBack) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findOpen, menuOpen, securityOpen, linkUrl, tabsOpen, activeTab.canGoBack, goBack]);

  const submitAddress = useCallback(() => {
    const resolved = resolveUserInput(address, settings.defaultSearchEngine);
    if (!resolved) return;
    navigateActive(resolved.url);
  }, [address, settings.defaultSearchEngine, navigateActive]);

  const openInputInCurrentTab = useCallback(
    (input: string) => {
      const resolved = resolveUserInput(input, settings.defaultSearchEngine);
      if (!resolved) {
        Alert.alert('Unable to perform search', 'Please enter a URL or search terms and try again.');
        return;
      }
      navigateActive(resolved.url);
    },
    [settings.defaultSearchEngine, navigateActive],
  );

  const goHome = useCallback(() => {
    const home = settings.homepage?.trim() || 'about:newtab';
    navigateActive(home, home === 'about:newtab' ? (privateActive ? 'Private tab' : 'New tab') : home);
  }, [settings.homepage, navigateActive, privateActive]);

  const openTabsSheet = useCallback(() => setTabsOpen(true), []);

  // Guarded utility navigation: prevents rapid double-taps from pushing
  // duplicate Converter/Work screens. Browser tab state lives in context
  // above the router, so leaving and returning loses nothing.
  const lastUtilityNav = useRef(0);
  const openUtility = useCallback(
    (path: '/converter' | '/work') => {
      const now = Date.now();
      if (now - lastUtilityNav.current < 800) return;
      lastUtilityNav.current = now;
      router.push(path);
    },
    [router],
  );

  const newTabGuarded = useCallback(
    (mode: 'normal' | 'private') => {
      const id = mode === 'private' ? createPrivateTab(true) : createTab(undefined, true, 'normal');
      if (!id) {
        Alert.alert('Tab limit reached', `Orizen keeps at most ${MAX_TABS} tabs open. Close an existing tab to open another one.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Tabs', onPress: openTabsSheet },
        ]);
      }
    },
    [createPrivateTab, createTab, openTabsSheet],
  );

  const openUrlInTab = useCallback(
    (url: string, mode: 'normal' | 'private') => {
      if (shouldBlockNavigation(url, trackerEffective, exceptedOrigins)) {
        showToast('Tracker blocked');
        return;
      }
      const id = createTab(url, true, mode);
      if (!id) {
        Alert.alert('Tab limit reached', `Orizen keeps at most ${MAX_TABS} tabs open. Close an existing tab to open another one.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Tabs', onPress: openTabsSheet },
        ]);
      }
    },
    [createTab, openTabsSheet, trackerEffective, exceptedOrigins, showToast],
  );

  const onTrackerBlocked = useCallback(
    (url: string) => {
      setBlockedUrl(url);
      showToast('Tracker blocked');
    },
    [showToast],
  );

  // The blocked URL belongs to the tab state that produced it.
  useEffect(() => {
    setBlockedUrl(null);
  }, [activeTabId]);

  const toggleBookmark = useCallback(async () => {
    const url = activeTab.url;
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert('Cannot bookmark this page', 'Only web pages can be bookmarked.');
      return;
    }
    try {
      if (bookmarked) {
        await removeBookmarkByUrl(url);
        setBookmarked(false);
      } else {
        await addBookmark(activeTab.title || url, url);
        setBookmarked(true);
        if (privateActive) {
          Alert.alert('Bookmark saved', 'Explicit bookmarks are kept even from private tabs. Browsing history is still not saved.');
        }
      }
      void refreshNewTabData();
    } catch {
      Alert.alert('Bookmark failed', 'Unable to save this bookmark. Please try again.');
    }
  }, [activeTab.url, activeTab.title, bookmarked, privateActive, refreshNewTabData]);

  // Find in page (term never persisted) ----
  const closeFind = useCallback(() => {
    setFindOpen(false);
    setFindTerm('');
    findTermRef.current = '';
    setFindMatch(null);
    injectIntoActive(FIND_CLEAR_SCRIPT);
  }, [injectIntoActive]);

  const runFind = useCallback(
    (term: string) => {
      findTermRef.current = term;
      setFindTerm(term);
      if (!term.trim()) {
        setFindMatch(null);
        injectIntoActive(FIND_CLEAR_SCRIPT);
        return;
      }
      injectIntoActive(buildFindScript(term.trim()));
    },
    [injectIntoActive],
  );

  const stepFind = useCallback(
    (dir: 1 | -1) => {
      if (!findTermRef.current.trim()) return;
      injectIntoActive(buildFindNavScript(dir));
    },
    [injectIntoActive],
  );

  const onFindResult = useCallback((count: number, index: number) => {
    if (count <= 0) setFindMatch('No matches');
    else setFindMatch(`${index} of ${count}`);
  }, []);

  const menuActions: MenuAction[] = [
    { id: 'new-tab', label: 'New tab', icon: 'add' },
    { id: 'new-private', label: 'New private tab', icon: 'eye-off', hint: 'No history or searches saved' },
    {
      id: 'privacy-mode',
      label: settings.privacyMode ? 'Privacy Mode: ON' : 'Privacy Mode',
      icon: 'shield-checkmark',
      hint: settings.privacyMode ? 'Tap to turn off' : 'History off · trackers blocked',
    },
    { id: 'reload', label: 'Reload', icon: 'reload' },
    ...(!showingNewTab
      ? [
          { id: 'nav-back', label: 'Back', icon: 'arrow-back', disabled: !activeTab.canGoBack } as MenuAction,
          { id: 'nav-forward', label: 'Forward', icon: 'arrow-forward', disabled: !activeTab.canGoForward } as MenuAction,
        ]
      : []),
    ...(blockedUrl
      ? [
          {
            id: 'allow-trackers',
            label: 'Allow trackers on blocked page',
            icon: 'shield-outline',
            hint: 'Loads it once with an exception you can revoke',
          } as MenuAction,
        ]
      : []),
    ...(showingNewTab ? [] : [{ id: 'find', label: 'Find in page', icon: 'search' } as MenuAction]),
    { id: 'bookmark', label: bookmarked ? 'Bookmarked' : 'Add bookmark', icon: bookmarked ? 'bookmark' : 'bookmark-outline' },
    { id: 'copy', label: 'Copy URL', icon: 'copy-outline' },
    { id: 'share', label: 'Share', icon: 'share-social-outline' },
    { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark-outline' },
    { id: 'history', label: 'History', icon: 'time-outline' },
    { id: 'downloads', label: 'Downloads', icon: 'download-outline' },
    { id: 'recently-closed', label: 'Recently closed', icon: 'refresh' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  const onMenuSelect = useCallback(
    async (id: string) => {
      setMenuOpen(false);
      switch (id) {
        case 'new-tab':
          newTabGuarded('normal');
          break;
        case 'new-private':
          newTabGuarded('private');
          break;
        case 'privacy-mode': {
          const next = !settings.privacyMode;
          if (!next && vpnStatus === 'connected') {
            Alert.alert('Turn off Privacy Mode?', 'Network VPN protection will also turn off.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Turn off', style: 'destructive', onPress: () => updateSettings({ privacyMode: false }) },
            ]);
          } else {
            updateSettings({ privacyMode: next });
            showToast(next ? 'Privacy Mode on' : 'Privacy Mode off');
          }
          break;
        }
        case 'reload':
          reload();
          break;
        case 'nav-back':
          if (activeTab.canGoBack) goBack();
          break;
        case 'nav-forward':
          if (activeTab.canGoForward) goForward();
          break;
        case 'allow-trackers': {
          const target = blockedUrl;
          setBlockedUrl(null);
          if (target) {
            const ok = await allowTrackersFor(target);
            if (ok) {
              showToast('Exception saved — loading page');
              navigateActive(target);
            } else {
              showToast('Could not save the exception');
            }
          }
          break;
        }
        case 'find':
          setFindMatch(null);
          setFindOpen(true);
          break;
        case 'bookmark':
          await toggleBookmark();
          break;
        case 'copy':
          if (activeTab.url && !isNewTabUrl(activeTab.url)) {
            await Clipboard.setStringAsync(activeTab.url);
            showToast('URL copied');
          }
          break;
        case 'share':
          if (/^https?:\/\//i.test(activeTab.url)) {
            // Explicit user action: sharing never creates a history entry.
            await Share.share({ message: `${activeTab.title}\n${activeTab.url}` }).catch(() => {});
          }
          break;
        case 'bookmarks':
          router.push('/bookmarks');
          break;
        case 'history':
          router.push('/history');
          break;
        case 'downloads':
          router.push('/downloads');
          break;
        case 'recently-closed':
          setTabsOpen(true);
          break;
        case 'settings':
          router.push('/settings');
          break;
        default:
          break;
      }
    },
    [activeTab.url, activeTab.title, activeTab.canGoBack, activeTab.canGoForward, goBack, goForward, newTabGuarded, reload, toggleBookmark, showToast, router, settings.privacyMode, vpnStatus, updateSettings, blockedUrl, allowTrackersFor, navigateActive],
  );

  const onLinkMenuSelect = useCallback(
    async (id: string) => {
      const url = linkUrl;
      setLinkUrl(null);
      if (!url) return;
      if ((id === 'link-open' || id === 'link-new' || id === 'link-private') && shouldBlockNavigation(url, trackerEffective, exceptedOrigins)) {
        showToast('Tracker blocked');
        return;
      }
      switch (id) {
        case 'link-open':
          navigateActive(url);
          break;
        case 'link-new':
          openUrlInTab(url, 'normal');
          break;
        case 'link-private':
          openUrlInTab(url, 'private');
          break;
        case 'link-copy':
          await Clipboard.setStringAsync(url);
          showToast('Link copied');
          break;
        case 'link-share':
          await Share.share({ message: url }).catch(() => {});
          break;
        default:
          break;
      }
    },
    [linkUrl, navigateActive, openUrlInTab, showToast, trackerEffective, exceptedOrigins],
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.flex, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <AddressBar
          value={address}
          isPrivate={privateActive}
          vpnConnected={vpnStatus === 'connected'}
          onChange={setAddress}
          onSubmit={submitAddress}
          loading={activeTab.loading}
          progress={activeTab.progress}
          onReload={reload}
          onStop={stopLoading}
          onSecurityPress={() => setSecurityOpen(true)}
        />
        <View style={styles.flex}>
          {showingNewTab ? (
            privateActive ? (
              <PrivateNewTabPage onNavigate={openInputInCurrentTab} onClosePrivate={() => closeTab(activeTabId)} />
            ) : (
              <NewTabPage
                onNavigate={openInputInCurrentTab}
                quickLinks={quickLinks}
                recent={recent}
                bookmarks={bookmarksPreview}
                historyEnabled={historyEffective}
                privacyMode={settings.privacyMode}
                trackerOn={trackerEffective}
                searchEngineId={settings.defaultSearchEngine}
                onSelectEngine={(id) => updateSettings({ defaultSearchEngine: id })}
                onOpenPrivacy={() => router.push('/privacy')}
                onOpenSettings={() => router.push('/settings')}
                onNewPrivateTab={() => newTabGuarded('private')}
                onAddQuickLink={(title, url) => {
                  const resolved = resolveUserInput(url, settings.defaultSearchEngine);
                  const finalUrl = resolved?.url ?? url;
                  void addQuickLink(title, finalUrl).then(() => void refreshNewTabData());
                }}
                onEditQuickLink={(qid, title, url) => {
                  const resolved = resolveUserInput(url, settings.defaultSearchEngine);
                  const finalUrl = resolved?.url ?? url;
                  void updateQuickLink(qid, title, finalUrl).then(() => void refreshNewTabData());
                }}
                onRemoveQuickLink={(qid) => void removeQuickLink(qid).then(() => void refreshNewTabData())}
                onOpenLink={(url) => navigateActive(url)}
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void refreshNewTabData().finally(() => setRefreshing(false));
                }}
              />
            )
          ) : (
            <BrowserWebView
              onNavigateHome={goHome}
              onLinkMenu={(url) => setLinkUrl(url)}
              onOpenWindowRequest={(url) => openUrlInTab(url, privateActive ? 'private' : 'normal')}
              onFindResult={onFindResult}
              onTrackerBlocked={onTrackerBlocked}
            />
          )}
        </View>
        {findOpen && !showingNewTab && (
          <FindBar
            term={findTerm}
            matchText={findMatch}
            onChange={runFind}
            onNext={() => stepFind(1)}
            onPrev={() => stepFind(-1)}
            onClose={closeFind}
          />
        )}
        {toolbarMode === 'empty' ? (
          // Homepage: keep the allocated area as a seamless spacer for future
          // features — no buttons, labels, borders or separators.
          <View style={{ height: toolbarHeight, backgroundColor: colors.toolbar }} />
        ) : (
          <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.toolbar }}>
            <BottomToolbar
              tabCount={tabCount}
              isPrivate={privateActive}
              onConverter={() => openUtility('/converter')}
              onWork={() => openUtility('/work')}
              onHome={goHome}
              onTabs={() => setTabsOpen(true)}
              onMore={() => setMenuOpen(true)}
            />
          </View>
        )}

        {toast && (
          <View style={styles.toastWrap} pointerEvents="none">
            <View style={[styles.toast, { backgroundColor: colors.text, borderRadius: radius.md }]}>
              <Text style={[styles.toastText, { color: colors.background }]}>{toast}</Text>
            </View>
          </View>
        )}

        <TabsSheet
          visible={tabsOpen}
          tabs={tabs}
          activeTabId={activeTabId}
          initialMode={privateActive ? 'private' : 'normal'}
          recentlyClosed={recentlyClosed}
          onSwitch={(id) => {
            switchTab(id);
            setTabsOpen(false);
          }}
          onClose={closeTab}
          onNew={(mode) => {
            newTabGuarded(mode);
            setTabsOpen(false);
          }}
          onCloseAll={(mode) => {
            closeAllTabs(mode);
            setTabsOpen(false);
          }}
          onReopen={() => {
            reopenClosedTab();
            setTabsOpen(false);
          }}
          onRestoreClosed={(id) => {
            restoreClosedTab(id);
            setTabsOpen(false);
          }}
          onClearClosed={clearRecentlyClosed}
          canReopen={recentlyClosed.length > 0}
          onDismiss={() => setTabsOpen(false)}
        />

        <MenuSheet
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          onSelect={(id) => void onMenuSelect(id)}
          actions={menuActions}
        />

        <MenuSheet
          visible={linkUrl !== null}
          title={linkUrl ?? undefined}
          onDismiss={() => setLinkUrl(null)}
          onSelect={(id) => void onLinkMenuSelect(id)}
          actions={[
            { id: 'link-open', label: 'Open', icon: 'open-outline' },
            { id: 'link-new', label: 'Open in New Tab', icon: 'add' },
            { id: 'link-private', label: 'Open in Private Tab', icon: 'eye-off' },
            { id: 'link-copy', label: 'Copy Link', icon: 'copy-outline' },
            { id: 'link-share', label: 'Share Link', icon: 'share-social-outline' },
          ]}
        />

        <SecuritySheet visible={securityOpen} url={showingNewTab ? '' : activeTab.url} status={privacyStatus} onDismiss={() => setSecurityOpen(false)} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' },
  toast: { paddingHorizontal: 18, paddingVertical: 10 },
  toastText: { fontWeight: '600', fontSize: 14 },
});
