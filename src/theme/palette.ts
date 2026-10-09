/**
 * Orizen monochrome palette (pure black / white / neutral gray).
 * Platform-free module so unit tests can assert exact theme values.
 * The WebView's own website content is never themed — these tokens drive
 * Orizen's browser interface only.
 */
export interface OrizenColors {
  background: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  /** Text/icon color drawn on top of `accent` surfaces. */
  onAccent: string;
  danger: string;
  success: string;
  warning: string;
  tabActive: string;
  toolbar: string;
  overlay: string;
}

export const LIGHT_COLORS: OrizenColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F2F2F2',
  text: '#000000',
  textMuted: '#6E6E6E',
  border: '#E4E4E4',
  accent: '#000000',
  accentSoft: '#EFEFEF',
  onAccent: '#FFFFFF',
  danger: '#DC2626',
  success: '#0E9F6E',
  warning: '#B45309',
  tabActive: '#FFFFFF',
  toolbar: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.45)',
};

export const DARK_COLORS: OrizenColors = {
  background: '#000000',
  surface: '#0A0A0A',
  surface2: '#1C1C1C',
  text: '#FFFFFF',
  textMuted: '#A3A3A3',
  border: '#2B2B2B',
  accent: '#FFFFFF',
  accentSoft: '#222222',
  onAccent: '#000000',
  danger: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  tabActive: '#1A1A1A',
  toolbar: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
};
