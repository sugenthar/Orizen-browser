import { buildSearchUrl, getSearchEngine } from './searchEngines';
import type { SearchEngineId } from '../types';

export type ResolvedInput = { kind: 'url'; url: string } | { kind: 'search'; url: string; query: string };

const URL_LIKE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

export function looksLikeUrl(input: string): boolean {
  const t = input.trim();
  if (t.length === 0 || t.includes(' ')) return false;
  if (t.startsWith('about:') || t.startsWith('orizen://')) return true;
  if (HAS_SCHEME.test(t)) {
    return t.startsWith('http://') || t.startsWith('https://');
  }
  // localhost / IP with optional port + path
  if (/^(localhost(:\d+)?(\/\S*)?|\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/\S*)?)$/i.test(t)) return true;
  return URL_LIKE.test(t);
}

export function ensureScheme(raw: string): string {
  const t = raw.trim();
  if (HAS_SCHEME.test(t)) return t;
  return `https://${t}`;
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function resolveUserInput(input: string, engineId: SearchEngineId): ResolvedInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (looksLikeUrl(trimmed)) {
    return { kind: 'url', url: ensureScheme(trimmed) };
  }
  const engine = getSearchEngine(engineId);
  return { kind: 'search', query: trimmed, url: buildSearchUrl(engine, trimmed) };
}

export function displayHost(url: string): string {
  try {
    if (url.startsWith('about:') || url.startsWith('orizen://')) return 'New tab';
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function normalizeUrlForHistory(url: string): string | null {
  const t = url.trim();
  if (!t || !isHttpUrl(t)) return null;
  // Privacy rule: search-result pages are never history, even when history is ON.
  if (isSearchResultsUrl(t)) return null;
  return t;
}

/**
 * True when the URL is a search-results page of a known engine.
 * Search queries must never be persisted — this is checked both before
 * recording history and inside the storage layer (defense in depth).
 */
export function isSearchResultsUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.toLowerCase();
  if (host === 'search.brave.com' && path.startsWith('/search')) return true;
  if (host === 'google.com' && path === '/search') return true;
  if (host === 'bing.com' && path === '/search') return true;
  // DuckDuckGo serves both homepage and results from "/": only results carry ?q=.
  if (host === 'duckduckgo.com' && (path === '/' || path === '') && parsed.searchParams.has('q')) return true;
  return false;
}
