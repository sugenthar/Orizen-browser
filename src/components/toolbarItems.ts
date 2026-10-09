/**
 * Bottom-toolbar definition for webpage tabs (pure, unit-tested).
 * Back/Forward intentionally have no entry here: navigation history still
 * works through the browser menu, the Android back button and swipe
 * gestures — the toolbar is reserved for Converter, Work, Home, Tabs, Menu.
 */

export const WEBPAGE_TOOLBAR_ORDER = ['converter', 'work', 'home', 'tabs', 'menu'] as const;

export type WebpageToolbarId = (typeof WEBPAGE_TOOLBAR_ORDER)[number];

export const TOOLBAR_LABELS: Record<WebpageToolbarId, string> = {
  converter: 'Converter',
  work: 'Work',
  home: 'Home',
  tabs: 'Tabs',
  menu: 'Menu',
};
