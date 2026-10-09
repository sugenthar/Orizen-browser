export function newId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function faviconFor(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/favicon.ico`;
  } catch {
    return null;
  }
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function domainInitial(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return (host.charAt(0) || 'O').toUpperCase();
  } catch {
    return 'O';
  }
}
