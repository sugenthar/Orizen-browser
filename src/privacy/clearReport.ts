/**
 * Pure clear-data reporting (no native dependencies — unit-tested).
 * Maps per-category boolean outcomes to honest user-facing messages.
 * A category that failed is NEVER reported as cleared.
 */

export type ClearCategory = 'history' | 'cache' | 'cookies';

export interface ClearResults {
  history?: boolean;
  cache?: boolean;
  cookies?: boolean;
  cookieError?: string | null;
}

export interface ClearReport {
  allSucceeded: boolean;
  message: string;
}

const LABELS: Record<ClearCategory, string> = {
  history: 'Browsing history',
  cache: 'Cached pages',
  cookies: 'Cookies',
};

export function summarizeClearResults(
  requested: ClearCategory[],
  results: ClearResults,
  cookieError?: string | null,
): ClearReport {
  const done: string[] = [];
  const failed: string[] = [];
  for (const category of requested) {
    const ok = category === 'history' ? results.history : category === 'cache' ? results.cache : results.cookies;
    if (ok) done.push(LABELS[category]);
    else failed.push(LABELS[category]);
  }
  const detail = failed.includes(LABELS.cookies) && cookieError ? ` (${cookieError})` : '';
  if (failed.length === 0) {
    return { allSucceeded: true, message: done.length > 0 ? `${done.join(', ')} cleared` : 'Nothing selected' };
  }
  if (done.length === 0) {
    return { allSucceeded: false, message: `${failed.join(', ')} could not be cleared${detail}` };
  }
  return { allSucceeded: false, message: `${done.join(', ')} cleared; ${failed.join(', ')} could not be cleared${detail}` };
}
