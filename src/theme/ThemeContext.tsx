import { useColorScheme } from 'react-native';
import React, { createContext, useContext, useMemo } from 'react';
import { useSettings } from '../settings/SettingsContext';

export interface OrizenColors {
  background: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  danger: string;
  success: string;
  warning: string;
  tabActive: string;
  toolbar: string;
  overlay: string;
}

export interface OrizenSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface OrizenType {
  caption: number;
  body: number;
  title: number;
  heading: number;
  display: number;
  wordmark: number;
}

/**
 * Typography: the platform system sans-serif (San Francisco on iOS, Roboto
 * on Android) with standardized weights. No bundled font and no font
 * dependency — the system faces already provide the intended clean look on
 * both platforms, with zero load-time cost and no flash of unstyled text.
 */
export interface OrizenWeight {
  regular: '400';
  medium: '500';
  semibold: '600';
  bold: '700';
}

const WEIGHT: OrizenWeight = { regular: '400', medium: '500', semibold: '600', bold: '700' };

const SPACING: OrizenSpacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

const TYPE: OrizenType = { caption: 12, body: 14, title: 16, heading: 19, display: 26, wordmark: 32 };

const LIGHT: OrizenColors = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surface2: '#ECEEF2',
  text: '#14181F',
  textMuted: '#6B7280',
  border: '#E2E5EB',
  accent: '#4F5CFF',
  accentSoft: '#E7E9FF',
  danger: '#DC2626',
  success: '#0E9F6E',
  warning: '#B45309',
  tabActive: '#FFFFFF',
  toolbar: '#FFFFFF',
  overlay: 'rgba(15,20,30,0.45)',
};

const DARK: OrizenColors = {
  background: '#0B0E14',
  surface: '#141926',
  surface2: '#1E2536',
  text: '#F1F3F8',
  textMuted: '#9AA3B5',
  border: '#263049',
  accent: '#7C86FF',
  accentSoft: '#232A4D',
  danger: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  tabActive: '#1E2536',
  toolbar: '#141926',
  overlay: 'rgba(0,0,0,0.55)',
};

interface ThemeValue {
  isDark: boolean;
  colors: OrizenColors;
  radius: { sm: number; md: number; lg: number; xl: number };
  spacing: OrizenSpacing;
  type: OrizenType;
  weight: OrizenWeight;
}

const BASE_VALUE = {
  radius: { sm: 8, md: 12, lg: 16, xl: 24 },
  spacing: SPACING,
  type: TYPE,
  weight: WEIGHT,
};

const ThemeContext = createContext<ThemeValue>({ isDark: false, colors: LIGHT, ...BASE_VALUE });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'system' && system === 'dark');
  const value = useMemo<ThemeValue>(
    () => ({ isDark, colors: isDark ? DARK : LIGHT, ...BASE_VALUE }),
    [isDark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
