import type { BrowserSettings } from '../types';

export const DEFAULT_SETTINGS: BrowserSettings = {
  defaultSearchEngine: 'brave',
  homepage: 'about:newtab',
  openLinksInNewTab: false,
  themeMode: 'system',
  javaScriptEnabled: true,
  cookiesEnabled: true,
  domStorageEnabled: true,
  blockPopups: true,
  saveBrowsingHistory: false,
  privacyMode: false,
  trackerProtectionEnabled: true,
  secureDnsEnabled: true,
  autoConnectVpn: false,
  restoreTabs: false,
};

const KEY = 'orizen.settings.v1';
const memory = new Map<string, string>();

// MMKV is optional: it requires a dev build (not Expo Go).
// We load it lazily and fall back to in-memory storage so the app never crashes.
type KV = { getString(k: string): string | undefined; set(k: string, v: string): void; remove(k: string): void };
let kv: KV | null = null;
let triedInit = false;

function backend(): KV {
  if (kv) return kv;
  if (!triedInit) {
    triedInit = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
      const store = new MMKV({ id: 'orizen' });
      kv = {
        getString: (k) => store.getString(k),
        set: (k, v) => store.set(k, v),
        remove: (k) => store.delete(k),
      };
    } catch {
      kv = {
        getString: (k) => memory.get(k),
        set: (k, v) => void memory.set(k, v),
        remove: (k) => void memory.delete(k),
      };
    }
  }
  return kv!;
}

export function loadSettings(): BrowserSettings {
  try {
    const raw = backend().getString(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<BrowserSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(next: BrowserSettings): void {
  try {
    backend().set(KEY, JSON.stringify(next));
  } catch {
    // non-fatal: settings simply won't persist
  }
}

export function clearSettingsStorage(): void {
  try {
    backend().remove(KEY);
  } catch {
    // ignore
  }
}

/** Raw key-value access sharing the same backend (used for tab snapshots). */
export function readRaw(key: string): string | null {
  try {
    return backend().getString(key) ?? null;
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string | null): void {
  try {
    if (value === null) backend().remove(key);
    else backend().set(key, value);
  } catch {
    // non-fatal
  }
}
