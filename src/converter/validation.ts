/**
 * Pure converter validation helpers (no native dependencies — unit-tested).
 */

const ILLEGAL = /[<>:"/\\|?*\u0000-\u001F]/g;

/** Upper bound for in-memory processing (200 MB). Larger files are refused. */
export const MAX_INPUT_BYTES = 200 * 1024 * 1024;

export function sanitizeFileName(raw: string): string {
  let name = raw;
  try {
    name = decodeURIComponent(name);
  } catch {
    // keep raw
  }
  name = name.replace(ILLEGAL, '_').replace(/^[\s.]+|[\s.]+$/g, '');
  if (name.length > 100) {
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.slice(dot) : '';
    name = `${name.slice(0, 100 - ext.length)}${ext}`;
  }
  return name || 'file';
}

export function replaceExtension(name: string, ext: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${sanitizeFileName(base)}.${ext}`;
}

/**
 * Build a non-colliding output name: `report.pdf`, `report (2).pdf`, …
 * Never silently overwrites — callers check existence against this list.
 */
export function uniqueName(desired: string, existing: string[]): string {
  const clean = sanitizeFileName(desired);
  if (!existing.includes(clean)) return clean;
  const dot = clean.lastIndexOf('.');
  const base = dot > 0 ? clean.slice(0, dot) : clean;
  const ext = dot > 0 ? clean.slice(dot) : '';
  let n = 2;
  while (existing.includes(`${base} (${n})${ext}`)) n += 1;
  return `${base} (${n})${ext}`;
}

/**
 * Parse page ranges like "1-3, 5, 8-6" into sorted unique 1-based pages,
 * validated against the document page count. Returns an error string on any
 * invalid input — never a partial guess.
 */
export function parsePageRanges(input: string, pageCount: number): { pages: number[] } | { error: string } {
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0 || pageCount < 1) return { error: 'Enter at least one page, e.g. 1-3, 5.' };
  const pages = new Set<number>();
  for (const part of parts) {
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    const single = /^(\d+)$/.exec(part);
    if (range?.[1] && range[2]) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (a < 1 || b < 1 || a > pageCount || b > pageCount) {
        return { error: `Pages must be between 1 and ${pageCount}.` };
      }
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let p = lo; p <= hi; p += 1) pages.add(p);
    } else if (single?.[1]) {
      const p = Number(single[1]);
      if (p < 1 || p > pageCount) return { error: `Pages must be between 1 and ${pageCount}.` };
      pages.add(p);
    } else {
      return { error: `Could not understand "${part}". Use numbers and ranges like 1-3, 5.` };
    }
  }
  return { pages: [...pages].sort((x, y) => x - y) };
}

export function isPdfName(name: string): boolean {
  return name.trim().toLowerCase().endsWith('.pdf');
}

export function isSupportedImage(name: string, mime?: string): boolean {
  const lower = name.trim().toLowerCase();
  if (/\.(png|jpe?g|webp)$/.test(lower)) return true;
  if (!mime) return false;
  const base = mime.split(';')[0]?.trim().toLowerCase() ?? '';
  return base === 'image/png' || base === 'image/jpeg' || base === 'image/webp';
}

/** Output is valid only if the file exists and is non-empty. */
export async function outputIsValid(
  getInfo: (uri: string) => Promise<{ exists: boolean; size?: number }>,
  uri: string,
): Promise<boolean> {
  try {
    const info = await getInfo(uri);
    return info.exists && (info.size ?? 0) > 0;
  } catch {
    return false;
  }
}
