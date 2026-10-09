/**
 * Tab performance policy (pure, unit-tested).
 * Bounds mounted WebViews and React re-renders without changing behavior:
 *  - selectMountedIds: active tab + most-recently-used tabs up to the cap.
 *  - shouldReportProgress: progress callbacks only produce state updates on
 *    meaningful deltas or completion, so a loading page does not re-render
 *    the whole browser tree on every progress tick.
 */

export const MAX_MOUNTED_WEBVIEWS = 6;

export function selectMountedIds(
  tabs: Array<{ id: string; lastActiveAt: number }>,
  activeId: string,
  max: number = MAX_MOUNTED_WEBVIEWS,
): Set<string> {
  const ordered = [...tabs].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  const ids = new Set<string>([activeId]);
  for (const t of ordered) {
    if (ids.size >= max) break;
    ids.add(t.id);
  }
  return ids;
}

export function shouldReportProgress(last: number, next: number): boolean {
  if (next >= 1) return true;
  if (last <= 0) return true;
  return next - last >= 0.03;
}
