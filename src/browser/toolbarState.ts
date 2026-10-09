/**
 * Context-aware toolbar state (pure, unit-tested — no React Native imports).
 *
 * Modes:
 *  - 'empty': the active tab shows the Orizen homepage / new-tab page.
 *    The toolbar keeps its allocated area as a seamless spacer; no buttons.
 *  - 'browser': a real page (or its error page) is displayed with the
 *    Converter / Work / Home / Tabs / Menu actions.
 *
 * Since v0.8.1 the toolbar stays visible while browsing: there is no
 * scroll-driven hide/collapse behavior, so no scroll tracking, thresholds,
 * listeners or per-tab hidden memory exist anymore.
 */

export type ToolbarMode = 'empty' | 'browser';

/**
 * Homepage detection uses the same tab state that decides between the
 * NewTabPage and the WebView (exact new-tab URLs + no error) — never a
 * URL substring guess.
 */
export function resolveToolbarMode(isNewTab: boolean, hasError: boolean): ToolbarMode {
  return isNewTab && !hasError ? 'empty' : 'browser';
}
