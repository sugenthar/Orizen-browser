/**
 * In-app brand wordmark: the exact text `𝓞𝓻𝓲𝔃𝓮𝓷`
 * (U+1D4DE U+1D4FB U+1D4F2 U+1D503 U+1D4EE U+1D4F7,
 * Mathematical Alphanumeric Symbols block, Bold Script).
 * Pure module (no React Native imports) so tests pin the exact codepoints.
 */
export const WORDMARK = '𝓞𝓻𝓲𝔃𝓮𝓷';

export const WORDMARK_CODEPOINTS = ['U+1D4DE', 'U+1D4FB', 'U+1D4F2', 'U+1D503', 'U+1D4EE', 'U+1D4F7'];

export function wordmarkCodepoints(): string[] {
  return [...WORDMARK].map((ch) => `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase()}`);
}
