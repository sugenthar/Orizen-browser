import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tap } from '../utils/haptics';

interface Props {
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  tabCount: number;
  isPrivate: boolean;
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
  onTabs: () => void;
  onMore: () => void;
}

function ToolbarButton({
  enabled,
  label,
  icon,
  onPress,
  badge,
  active,
  activeColor,
  dimColor,
}: {
  enabled: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
  active?: boolean;
  activeColor: string;
  dimColor: string;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={!enabled}
      hitSlop={8}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [styles.btn, { opacity: enabled ? (pressed ? 0.65 : 1) : 0.32 }]}
    >
      <View style={[styles.iconWrap, active && { backgroundColor: `${activeColor}22` }]}>
        <Ionicons name={icon} size={23} color={active ? activeColor : dimColor} />
      </View>
      <Text style={[styles.label, { color: dimColor }]}>{label}</Text>
      {typeof badge === 'number' && (
        <View style={[styles.badge, { backgroundColor: activeColor }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
        </View>
      )}
    </Pressable>
  );
}

function BottomToolbarInner({ canGoBack, canGoForward, tabCount, isPrivate, onBack, onForward, onHome, onTabs, onMore }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.toolbar, borderTopColor: colors.border, borderRadius: 0 }]}>
      <ToolbarButton enabled={canGoBack} label="Back" icon="arrow-back" onPress={onBack} activeColor={colors.accent} dimColor={colors.text} />
      <ToolbarButton enabled={canGoForward} label="Forward" icon="arrow-forward" onPress={onForward} activeColor={colors.accent} dimColor={colors.text} />
      <ToolbarButton enabled label="Home" icon="home" onPress={onHome} activeColor={colors.accent} dimColor={colors.text} />
      <ToolbarButton enabled label="Tabs" icon="layers" onPress={onTabs} badge={tabCount} active={isPrivate} activeColor={colors.accent} dimColor={colors.text} />
      <ToolbarButton enabled label="Menu" icon="menu" onPress={onMore} activeColor={colors.accent} dimColor={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, paddingTop: 6, paddingBottom: 10 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, minHeight: 58, minWidth: 44 },
  iconWrap: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  badge: { position: 'absolute', top: 4, right: 14, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export const BottomToolbar = memo(BottomToolbarInner);
