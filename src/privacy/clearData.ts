import { shouldRecordHistory } from './privacyService';
import { clearHistory } from '../storage/database';
import type { TabMode } from '../types';

/**
 * Best-effort browsing-data clearing without fake privacy claims.
 * - History lives in SQLite and is fully deleted.
 * - Search history needs no clearing: it is never written (see privacyService).
 * - WebView cache and page-level DOM storage are cleared where the platform
 *   allows (see siteData.ts for native cookie clearing, which needs a
 *   development build that includes the cookie module).
 */
export async function clearPageStorageForTabs(inject: (script: string) => void): Promise<void> {
  try {
    inject('try{localStorage.clear();sessionStorage.clear();}catch(e){} true;');
  } catch {
    // ignore per-webview failures
  }
}

export async function clearBrowsingHistoryOnly(): Promise<void> {
  await clearHistory();
}

export { shouldRecordHistory };
export type { TabMode };
