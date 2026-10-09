import type { SearchEngine, SearchEngineId } from '../types';

/**
 * Modular search-engine registry.
 * To add a new engine, append an entry here — no other code changes required.
 */
export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'brave',
    name: 'Brave Search',
    searchUrl: 'https://search.brave.com/search?q=%s',
    homepage: 'https://search.brave.com',
  },
  {
    id: 'google',
    name: 'Google',
    searchUrl: 'https://www.google.com/search?q=%s',
    homepage: 'https://www.google.com',
  },
  {
    id: 'bing',
    name: 'Bing',
    searchUrl: 'https://www.bing.com/search?q=%s',
    homepage: 'https://www.bing.com',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    searchUrl: 'https://duckduckgo.com/?q=%s',
    homepage: 'https://duckduckgo.com',
  },
];

export const DEFAULT_SEARCH_ENGINE_ID: SearchEngineId = 'brave';

export function getSearchEngine(id: SearchEngineId): SearchEngine {
  return SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0]!;
}

export function buildSearchUrl(engine: SearchEngine, query: string): string {
  return engine.searchUrl.replace('%s', encodeURIComponent(query));
}
