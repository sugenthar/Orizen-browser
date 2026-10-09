/**
 * Browser-level tracker protection.
 *
 * Mechanism: main-frame navigation interception (onShouldStartLoadWithRequest
 * / window-open targets). Navigations whose host is a known pure-tracker
 * domain are blocked before they load. This is real protection where the
 * WebView API allows it, with honest limits:
 *  - Sub-resource trackers (pixels/scripts inside a page) are NOT visible to
 *    this API and are not blocked.
 *  - Only hosts whose sole purpose is tracking/ad-click attribution are
 *    listed, so normal sites never break.
 *  - No browsing URLs are stored or logged; diagnostics are generic.
 *
 * The list is intentionally small and local — no remote database is fetched.
 */

const TRACKER_HOSTS: readonly string[] = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'scorecardresearch.com',
  'quantserve.com',
  'hotjar.com',
  'hotjar.io',
  'mouseflow.com',
  'luckyorange.com',
  'crazyegg.com',
  'fullstory.com',
  'mixpanel.com',
  'segment.com',
  'segment.io',
  'amplitude.com',
  'taboola.com',
  'outbrain.com',
  'revcontent.com',
  'mgid.com',
  'addthis.com',
  'sharethis.com',
  'chartbeat.com',
  'newrelic.com',
  'nr-data.net',
  'optimizely.com',
  'criteo.com',
  'criteo.net',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'moatads.com',
];

export function getTrackerHostCount(): number {
  return TRACKER_HOSTS.length;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** True when the URL's host is (or sits under) a listed tracker domain. */
export function isTrackerUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return TRACKER_HOSTS.some((t) => host === t || host.endsWith(`.${t}`));
}

/**
 * Whether a top-level navigation should be blocked.
 * Never blocks non-http(s) URLs (external schemes have their own path) and
 * never blocks when the user disabled the feature. Origins the user
 * explicitly excepted (tracker allow-list) are never blocked.
 */
export function shouldBlockNavigation(
  url: string,
  trackerProtectionEnabled: boolean,
  exceptedOrigins: string[] = [],
): boolean {
  if (!trackerProtectionEnabled) return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (exceptedOrigins.length > 0) {
    const origin = originOf(trimmed);
    if (origin && exceptedOrigins.includes(origin)) return false;
  }
  return isTrackerUrl(trimmed);
}

function originOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.toLowerCase();
    if (scheme !== 'http:' && scheme !== 'https:') return null;
    return `${scheme}//${parsed.hostname.toLowerCase()}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return null;
  }
}
