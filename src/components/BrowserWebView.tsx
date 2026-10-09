import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { WebViewProgressEvent } from 'react-native-webview/lib/WebViewTypes';
import { useTabs } from '../browser/TabContext';
import { LINK_MENU_SCRIPT } from '../browser/pageScripts';
import { MAX_MOUNTED_WEBVIEWS, selectMountedIds, shouldReportProgress } from '../browser/tabPerformance';
import { useDownloads } from '../downloads/DownloadContext';
import { useSitePermissions } from '../permissions/SitePermissionContext';
import { resolveHistoryEnabled } from '../privacy/privacyMode';
import { shouldRecordHistory } from '../privacy/privacyService';
import { shouldBlockNavigation } from '../privacy/trackerProtection';
import { useSettings } from '../settings/SettingsContext';
import { addHistory } from '../storage/database';
import { isNewTabUrl } from '../types';
import { ErrorView } from './ErrorView';

const EXTERNAL_SCHEMES = ['tel:', 'mailto:', 'sms:', 'smsto:', 'intent:', 'market:', 'upi:', 'whatsapp:', 'geo:'];

function isExternal(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('about:') || lower.startsWith('data:') || lower.startsWith('blob:')) {
    return false;
  }
  return EXTERNAL_SCHEMES.some((s) => lower.startsWith(s)) || /^[a-z][a-z0-9+.-]*:/.test(lower);
}

interface LinkMessage {
  type: string;
  url?: string;
}

function parseLinkMessage(data: string): string | null {
  try {
    const msg = JSON.parse(data) as LinkMessage;
    if (msg.type !== 'orizen-link' || typeof msg.url !== 'string') return null;
    const url = msg.url.trim();
    // Only page http(s) links reach the link menu. Everything else keeps the
    // existing external-scheme path. Never act on other message shapes.
    if (!/^https?:\/\//i.test(url)) return null;
    return url;
  } catch {
    return null;
  }
}

interface FindMessage {
  type: string;
  count?: number;
  index?: number;
}

function parseFindMessage(data: string): { count: number; index: number } | null {
  try {
    const msg = JSON.parse(data) as FindMessage;
    if (msg.type !== 'orizen-find') return null;
    if (typeof msg.count !== 'number' || typeof msg.index !== 'number') return null;
    return { count: msg.count, index: msg.index };
  } catch {
    return null;
  }
}

interface Props {
  onNavigateHome: () => void;
  onLinkMenu: (url: string) => void;
  onOpenWindowRequest: (url: string) => void;
  onFindResult: (count: number, index: number) => void;
  /** Fired with the blocked URL (transient UI use only — never persisted or logged). */
  onTrackerBlocked: (url: string) => void;
}

function BrowserWebViewInner({ onNavigateHome, onLinkMenu, onOpenWindowRequest, onFindResult, onTrackerBlocked }: Props) {
  const { tabs, activeTabId, updateTab, registerWebView } = useTabs();
  const { settings } = useSettings();
  const { startDownload } = useDownloads();
  const { trackerExceptions } = useSitePermissions();
  const exceptedOrigins = useMemo(() => trackerExceptions.map((e) => e.origin), [trackerExceptions]);
  // Privacy Mode forces tracker protection on; otherwise the user setting applies.
  const trackerOn = settings.privacyMode || settings.trackerProtectionEnabled;

  // LRU mounted set: active tab + most recently used tabs (pure selector).
  const mountedIds = useMemo(
    () => selectMountedIds(tabs, activeTabId, MAX_MOUNTED_WEBVIEWS),
    [tabs, activeTabId],
  );
  const lastProgress = useRef(new Map<string, number>());

  const maybeRecord = useCallback(
    (tabId: string, url: string | undefined, title: string | undefined) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !url) return;
      // Single privacy choke point: private tabs, history-OFF, Privacy Mode,
      // non-http and search-result URLs never reach storage.
      const historyOn = resolveHistoryEnabled(settings.saveBrowsingHistory, settings.privacyMode);
      if (!shouldRecordHistory(url, tab.mode, historyOn).shouldRecordHistory) return;
      void addHistory(title || url, url);
    },
    [tabs, settings.saveBrowsingHistory, settings.privacyMode],
  );

  const handleNavState = useCallback(
    (tabId: string, nav: WebViewNavigation) => {
      updateTab(tabId, {
        url: nav.url,
        title: nav.title || nav.url,
        loading: nav.loading,
        canGoBack: nav.canGoBack,
        canGoForward: nav.canGoForward,
      });
      if (!nav.loading) maybeRecord(tabId, nav.url, nav.title);
    },
    [updateTab, maybeRecord],
  );

  const handleProgress = useCallback(
    (tabId: string, e: WebViewProgressEvent) => {
      // Throttle: small deltas do not produce state updates, so a loading
      // page stops re-rendering the whole browser tree on every tick.
      const next = e.nativeEvent.progress;
      const last = lastProgress.current.get(tabId) ?? 0;
      if (!shouldReportProgress(last, next)) return;
      lastProgress.current.set(tabId, next);
      updateTab(tabId, { progress: next, loading: next < 1 });
    },
    [updateTab],
  );

  const handleMessage = useCallback(
    (e: WebViewMessageEvent) => {
      const url = parseLinkMessage(e.nativeEvent.data);
      if (url) {
        onLinkMenu(url);
        return;
      }
      const found = parseFindMessage(e.nativeEvent.data);
      if (found) onFindResult(found.count, found.index);
    },
    [onLinkMenu, onFindResult],
  );

  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const focused = tab.id === activeTabId;
        const showNewTab = isNewTabUrl(tab.url);
        const isPrivate = tab.mode === 'private';
        if (showNewTab && !tab.error) {
          return <View key={tab.id} style={[styles.fill, { display: focused ? 'flex' : 'none' }]} collapsable={false} />;
        }
        if (tab.error && focused) {
          return (
            <View key={tab.id} style={styles.fill} collapsable={false}>
              <ErrorView url={tab.url} message={tab.error} onRetry={() => updateTab(tab.id, { error: null })} onHome={onNavigateHome} />
              <View style={{ height: 0, overflow: 'hidden' }}>
                <WebView
                  source={{ uri: tab.url }}
                  style={{ width: 1, height: 1 }}
                  javaScriptEnabled={settings.javaScriptEnabled}
                  domStorageEnabled={settings.domStorageEnabled}
                />
              </View>
            </View>
          );
        }
        if (!mountedIds.has(tab.id)) {
          // Evicted for memory: metadata preserved, reloads when selected.
          return <View key={tab.id} style={[styles.fill, { display: focused ? 'flex' : 'none' }]} collapsable={false} />;
        }
        return (
          <View key={tab.id} style={[styles.fill, { display: focused ? 'flex' : 'none' }]} collapsable={false}>
            <WebView
              ref={(r) => registerWebView(tab.id, r)}
              source={{ uri: tab.url }}
              style={styles.fill}
              // Private tabs: OS-level ephemeral session where supported
              // (no persistent cookies/cache on Android WebView / WKWebView).
              incognito={isPrivate}
              cacheEnabled={!isPrivate}
              javaScriptEnabled={settings.javaScriptEnabled}
              domStorageEnabled={isPrivate ? false : settings.domStorageEnabled}
              thirdPartyCookiesEnabled={isPrivate ? false : settings.cookiesEnabled}
              sharedCookiesEnabled={isPrivate ? false : settings.cookiesEnabled}
              allowsBackForwardNavigationGestures
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback
              // Least privilege: location is off; camera/mic stay behind the
              // OS permission prompt (Orizen auto-grants nothing).
              geolocationEnabled={false}
              javaScriptCanOpenWindowsAutomatically={!settings.blockPopups}
              setSupportMultipleWindows
              originWhitelist={['http://*', 'https://*', 'about:*']}
              injectedJavaScript={LINK_MENU_SCRIPT}
              onMessage={handleMessage}
              onOpenWindow={(e) => {
                const target = e.nativeEvent.targetUrl;
                if (target && /^https?:\/\//i.test(target.trim())) onOpenWindowRequest(target.trim());
              }}
              onFileDownload={(e) => {
                startDownload(e.nativeEvent.downloadUrl, isPrivate);
              }}
              onNavigationStateChange={(nav) => handleNavState(tab.id, nav)}
              onLoadProgress={(e) => handleProgress(tab.id, e)}
              onLoadStart={() => updateTab(tab.id, { loading: true, error: null })}
              onLoadEnd={(e) => {
                const { nativeEvent } = e;
                updateTab(tab.id, {
                  loading: false,
                  progress: 1,
                  url: nativeEvent.url || tab.url,
                  title: nativeEvent.title || tab.title,
                });
                maybeRecord(tab.id, nativeEvent.url, nativeEvent.title);
              }}
              onError={(e) => {
                const desc = e.nativeEvent.description || 'The page could not be loaded.';
                if (focused) updateTab(tab.id, { loading: false, error: desc });
                console.warn('[Orizen] Page failed to load');
              }}
              onHttpError={(e) => {
                const code = e.nativeEvent.statusCode;
                if (code >= 400 && focused) {
                  updateTab(tab.id, { loading: false, error: `Server returned status ${code}.` });
                }
              }}
              renderError={() => <View style={styles.fill} />}
              onShouldStartLoadWithRequest={(req) => {
                // Tracker protection: block top-level navigations to known
                // tracker hosts before they load (minus user exceptions).
                // Generic UI only, no URL logging.
                if (shouldBlockNavigation(req.url, trackerOn, exceptedOrigins)) {
                  onTrackerBlocked(req.url);
                  return false;
                }
                if (isExternal(req.url)) {
                  void Linking.openURL(req.url).catch(() => {
                    updateTab(tab.id, { error: 'No app can open this link.' });
                  });
                  return false;
                }
                return true;
              }}
              onContentProcessDidTerminate={() => {
                if (focused) updateTab(tab.id, { error: 'The page stopped responding and was closed to protect the app.' });
              }}
              onRenderProcessGone={() => {
                if (focused) updateTab(tab.id, { error: 'The page crashed. Your other tabs are unaffected.' });
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  fill: { flex: 1 },
});

export const BrowserWebView = memo(BrowserWebViewInner);
