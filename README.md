# Orizen Browser — v0.6.2

A real, lightweight, privacy-first personal mobile browser. Android-first, iOS-compatible.

> Privacy Mode prevents Orizen from storing your activity. It does not make
> you anonymous to websites, networks, or providers you use. A real VPN
> requires an actual VPN provider/backend and OS-level VPN integration, which
> Orizen v0.6.0 does not bundle — so it reports VPN as Not Available instead
> of pretending.

## Changelog — v0.6.2

Text-only branding & typography
- Removed all in-app graphical brand marks (header emblem, hero emblem);
  the word `Orizen` now renders as text only, semibold, with no icon beside it
- Typography system on the platform system sans-serif (San Francisco on iOS,
  Roboto on Android): no bundled font, no new dependency, no load-time cost
- Shared weight tokens (regular/medium/semibold/bold) in the theme; headings
  normalized from extrabold to bold, shared header and About wordmark updated
- OS app icon/splash assets kept (required by Expo, never shown in-app)

Only features that actually work are documented; limitations are stated inline.

## Changelog — v0.6.1

Traditional homepage
- Replaced the dashboard-style start page with a clean, conventional browser
  homepage: compact header, centered brand mark, prominent search/address
  field, engine selector, and a simple shortcut grid
- Removed greeting/date line, privacy summary card, private-tab card, and
  homepage recents/bookmarks previews (history screen unchanged)
- Borderless shortcut tiles with neutral fallback icons (no network favicons),
  responsive 4/5-column grid, Add tile, minimal empty state
- All homepage callbacks, storage, privacy rules and toolbar behavior unchanged

## Changelog — v0.6.0

Privacy UI Redesign
- Premium home dashboard: brand header with privacy pill + settings, hero
  search card with engine selector, privacy summary card, private-tab entry,
  refined quick-access grid, recents and bookmarks (all existing data flows)
- Central theme tokens: semantic colors (+warning/overlay), spacing scale,
  typography scale; light/dark/system via existing MMKV setting
- Shared UI primitives (ScreenHeader, EmptyState, SectionTitle, SheetHandle,
  StatusDot) used by bookmarks, history, downloads, privacy, permissions
- Refined address bar (focus glow, private tint, thicker progress track),
  toolbar (pressed states, pill icon wells, guarded haptic taps),
  tab switcher (sheet handle, active borders, haptics), sheets (handles,
  themed overlays)
- Settings reorganized into Appearance, Search engine, Privacy and security,
  Browsing history and data, Tabs and startup, Downloads, Site permissions,
  About Orizen — every control keeps its exact behavior
- No new dependencies; WebView content never themed; LRU/tabs untouched

Only features that actually work are documented; limitations are stated inline.

## Changelog — v0.5.0
Native Privacy & Reliability
- Real native cookie clearing via the maintained cookie module (dev-build
  rebuild required): separate Cookies action with honest per-category outcome
  reporting — failures are never reported as success
- Site Permissions screen: factual camera/microphone (OS prompt gate),
  location Blocked, uploads via system picker, notifications unsupported,
  per-site tracker exceptions with revoke/clear-all
- Correct Android behavior verified against native sources: camera/mic follow
  the OS permission dialog, location stays disabled, no broad storage
  permissions added (scoped storage + system picker only)
- Tracker exceptions: blocked pages offer an explicit allow-exception flow;
  exceptions bypass blocking per origin and are revocable
- Session restoration: opt-in setting (default OFF) restoring normal tabs
  only — private tabs, search pages and malformed state never restore
- Download retry for failed/cancelled items while the source is in memory
  (never persisted), byte-accurate progress, honest storage/auth notes
- Performance: pure LRU selector, progress-update throttling (meaningful
  deltas only), snapshot writes on identity change only
- Privacy Mode integrity: toggling never mutates the stored history
  preference (regression-tested); dashboard documents setting vs capability
- 72 unit tests (permissions, clear reporting, sessions, performance,
  tracker exceptions, regressions)

Only features that actually work are documented; limitations are stated inline.

## Changelog — v0.4.0

Privacy Network
- Privacy Mode toggle (menu, dashboard, settings): forces history off and
  tracker blocking on; disabling warns when VPN was connected
- Real VPN abstraction (`VPNService`/`VPNProvider`): capability detection,
  honest `Not Available` state, connect refuses without a backend, full
  lifecycle ready for a future native module — never claims Connected
- Secure DNS abstraction: accurately reports System Default (WebView uses the
  OS stack; Orizen cannot verify DoH), never claims Active
- Tracker protection: local 30+ host ruleset blocking top-level tracker
  navigations (page, popups, link menu); user-disableable
- Fingerprint protection honestly reported as Limited
- Central `resolvePrivacyStatus()` — one source of truth for all UI
- Automatic private cleanup: Clear Private Data (closes private tabs + cache)
- Platform capability matrix adapts UI to what the build can actually do
- 50 unit tests incl. VPN honesty, tracker, regression suites

Only features that actually work are documented; limitations are stated inline.

## Changelog — v0.3.0

Browser Core
- Download manager: real downloads with progress, open via system share sheet,
  delete, clear finished (SQLite metadata, privacy-by-schema: no URL column)
- File uploads use the OS picker via the system WebView (no extra permissions)
- Least-privilege WebView defaults (location off, nothing auto-granted)
- Open in new tab (window.open / target=_blank) and Open in private tab
- Long-press link menu: Open / New Tab / Private Tab / Copy / Share
- Share page and Copy URL with confirmation feedback
- Recently closed tabs UI in the tab switcher (normal tabs only, in-memory)
- Tab-limit dialog with View Tabs action; 20-tab cap and 6-WebView LRU kept
- Find in page with match counts, prev/next, term never persisted
- Security sheet: factual HTTPS/HTTP connection info per page
- Clear browsing data now covers history + WebView cache; cookies honestly
  reported as requiring a native module
- Error recovery: SSL-blocked and crashed-page states; render-process-gone handling
- 26 unit tests (search, privacy policy, download helpers) via `npm test`

Only features that actually work are documented; limitations are stated inline.

## Privacy model (unchanged from v0.2.0)

- **Search history is never stored.** Search terms go to the selected engine only;
  nothing is written to SQLite, MMKV, files, or logs — enforced in
  `src/privacy/privacyService.ts` and refused again inside the storage layer.
- **Browsing history is OFF by default** (`saveBrowsingHistory: false` in MMKV).
  When off, no visited page is recorded and the new-tab page shows Quick Links
  + Bookmarks instead of recents. When on, only plain visited pages are stored —
  search-result pages are still excluded.
- **Private Tabs** (`mode: 'private'`): separate tab strip, ephemeral WebView
  session (`incognito`, no cache/cookies/DOM storage), never recorded, never
  added to recently-closed, unmounted on close. Explicit bookmarks from private
  tabs are kept (intentional user action, clearly messaged in UI).
- No analytics, tracking, ads, telemetry, or cloud sync. No network favicons.

## Changelog — v0.2.0

Privacy
- Search history is never stored (central `privacyService.shouldRecordHistory`)
- Browsing history disabled by default (opt-in in Settings → Privacy)
- Added Private Tabs with isolated ephemeral sessions
- Private tabs do not persist browsing history
- SQLite migration purges legacy search-result history (bookmarks/quick links preserved)

UI
- Consistent Ionicons icon system (no more text glyphs)
- Redesigned bottom toolbar with private indicator
- Improved address bar (HTTPS lock indicator, focus highlight, clear/reload)
- Improved tab switcher with Normal/Private segments
- Dedicated private new-tab page with honest privacy wording
- Improved new-tab page (recents only when history enabled, quick-link editing)
- Improved settings/privacy screens with working Clear browsing data dialog
- Improved error page with distinct states and icons

Storage
- SQLite migration (idempotent, preserves bookmarks/quick links/settings)
- MMKV privacy settings (`saveBrowsingHistory`)
- Removed search-history persistence at every layer

## Stack

- Expo SDK 54 · React Native 0.81.5 · React 19.1.0 · TypeScript (strict)
- `expo-router` for navigation
- `react-native-webview` for rendering (Android WebView / WKWebView — no custom engine)
- `expo-sqlite` for bookmarks / history / quick links
- `react-native-mmkv` for settings, with in-memory fallback
- `react-native-safe-area-context`, `react-native-screens`, `expo-*` utilities

## Run

```bash
npm install
npx expo-doctor
npx tsc --noEmit
npx expo start
```

Tap `a` to open Android. **Use a dev build for real browsing:**

```bash
npx expo run:android
```

## Why a dev build (not Expo Go)?

A real browser needs native behaviour Expo Go cannot provide:

1. `react-native-mmkv` needs a native module — inside Expo Go it falls back to
   in-memory storage (settings won't persist across restarts).
2. Global cookie / cache / DOM-storage purging belongs to Android WebView /
   WKWebView. In v0.1 we clear SQLite history and page-level
   `localStorage`/`sessionStorage` via injected JS; full purge needs
   `CookieManager`/`WebStorage` in a dev build.
3. File downloads need DownloadManager / SAF + background notifications (v0.2).

Nothing is faked: the UI states these limits honestly (see Settings → About,
Downloads screen, `src/privacy/clearData.ts`).

## Milestone test checklist

- [ ] Launch → Orizen new-tab page
- [ ] `https://example.com` opens directly; `Tamil Nadu weather` searches (Brave default)
- [ ] Change engine in Settings (Brave/Google/Bing/DuckDuckGo)
- [ ] Back/Forward disabled states, loading progress, reload/stop
- [ ] Multiple tabs persist without reload on switch; close / close-all / reopen
- [ ] Bookmark add/remove/edit/open/search
- [ ] History list/search/delete/clear (paginated, virtualized)
- [ ] Settings: homepage, open-in-new-tab, theme light/dark/system, JS/cookies/DOM/popup
- [ ] Error page on offline/bad URL with retry + home (never crashes app)
- [ ] Android hardware back → WebView back first
- [ ] Safe-area, portrait, keyboard (address field `web-search`, `selectTextOnFocus`)
- [ ] `npx expo-doctor` 18/18 · `npx tsc --noEmit` clean

## Structure

```text
app/                 expo-router routes (index, bookmarks, history, settings, downloads)
src/
  browser/           TabContext (tab manager + WebView ref registry)
  search/            modular engines + URL/search resolver
  storage/           MMKV settings + SQLite (bookmarks/history/quick-links)
  settings/          SettingsContext
  theme/             Orizen light/dark theme
  components/        AddressBar, BottomToolbar, BrowserWebView, NewTabPage,
                     ErrorView, TabsSheet, MenuSheet
  privacy/           honest clear-data helpers
  downloads/        v0.2 stub (no fake manager)
  utils/             ids, favicons, formatting
```

## Native rebuild (required after adding native modules)

Native modules (cookie manager, MMKV, WebView) live in the app binary, not in
Metro's JavaScript bundle. Restarting Metro or clearing its cache can NEVER
register a missing native module. After installing a native package or
changing `app.json` permissions/plugins:

```powershell
cd "D:\ReactNative\orizen browser"
npx expo prebuild --clean   # regenerates android/ via config plugins (destructive: explain before use)
npx expo run:android        # rebuilds + reinstalls the dev client (needs device/emulator)
npx expo start --clear      # fresh Metro cache against the new binary
```

Note: `cookie clearing` in Settings reports a structured
failure ("needs a development build…") instead of crashing when the binary
predates the module — but real deletion still requires the rebuild above.
