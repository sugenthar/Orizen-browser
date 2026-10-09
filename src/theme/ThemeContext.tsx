import { useColorScheme } from 'react-native';
import React, { createContext, useContext, useMemo } from 'react';
import { useSettings } from '../settings/SettingsContext';
import { DARK_COLORS, LIGHT_COLORS, type OrizenColors } from './palette';

export type { OrizenColors };

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

const ThemeContext = createContext<ThemeValue>({ isDark: false, colors: LIGHT_COLORS, ...BASE_VALUE });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'system' && system === 'dark');
  const value = useMemo<ThemeValue>(
    () => ({ isDark, colors: isDark ? DARK_COLORS : LIGHT_COLORS, ...BASE_VALUE }),
    [isDark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
