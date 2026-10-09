/**
 * Automatic privacy cleanup orchestration.
 *
 * Scope (never exceeded without an explicit user action elsewhere):
 *  - private tabs are closed (their WebViews unmount, state is dropped)
 *  - the WebView resource cache is purged where the platform API allows
 * Never touched here: bookmarks, quick links, user settings, download files.
 */

export interface PrivateCleanupActions {
  closePrivateTabs: () => void;
  clearCache: () => void;
}

export const CLEAR_PRIVATE_DATA_DESCRIPTION =
  'Closes all private tabs and clears cached pages. Bookmarks, quick links, settings and downloads are kept.';

export const CLEAR_ALL_DATA_DESCRIPTION =
  'Deletes browsing history and cached pages, and closes private tabs. Bookmarks, quick links and settings are kept unless cleared separately.';

export async function clearPrivateSessionData(actions: PrivateCleanupActions): Promise<void> {
  actions.closePrivateTabs();
  actions.clearCache();
}
