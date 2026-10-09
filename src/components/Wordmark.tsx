import React, { memo } from 'react';
import { Text, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { WORDMARK } from '../theme/brand';

export { WORDMARK, wordmarkCodepoints, WORDMARK_CODEPOINTS } from '../theme/brand';

/**
 * Text-only brand wordmark (no graphic logo). Rendered with the platform
 * system font so the OS applies its own glyph fallback. See brand.ts.
 */

export const Wordmark = memo(function Wordmark({ size = 22, style }: { size?: number; style?: TextStyle }) {
  const { colors, weight } = useTheme();
  return (
    <Text
      style={[{ color: colors.text, fontSize: size, lineHeight: Math.round(size * 1.4), fontWeight: weight.semibold, letterSpacing: 0.2 }, style]}
      accessibilityLabel="Orizen"
      accessibilityRole="header"
    >
      {WORDMARK}
    </Text>
  );
});
