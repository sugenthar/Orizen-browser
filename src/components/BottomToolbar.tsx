import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { tap } from '../utils/haptics';
import { TOOLBAR_LABELS, WEBPAGE_TOOLBAR_ORDER, type WebpageToolbarId } from './toolbarItems';

interface Props {
  tabCount: number;
  isPrivate: boolean;
  onConverter: () => void;
  onWork: () => void;
  onHome: () => void;
  onTabs: () => void;
  onMore: () => void;
}

const ICONS: Record<WebpageToolbarId, keyof typeof Ionicons.glyphMap> = {
  converter: 'swap-horizontal',
  work: 'briefcase',
  home: 'home',
  tabs: 'layers',
  menu: 'menu',
};

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
  const { colors } = useTheme();
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
          <Text style={[styles.badgeText, { color: colors.onAccent }]}>{badge > 99 ? '99+' : String(badge)}</Text>
        </View>
      )}
    </Pressable>
  );
}

function BottomToolbarInner({ tabCount, isPrivate, onConverter, onWork, onHome, onTabs, onMore }: Props) {
  const { colors } = useTheme();
  const handlers: Record<WebpageToolbarId, () => void> = {
    converter: onConverter,
    work: onWork,
    home: onHome,
    tabs: onTabs,
    menu: onMore,
  };
  return (
    <View style={[styles.wrap, { backgroundColor: colors.toolbar, borderTopColor: colors.border, borderRadius: 0 }]}>
      {WEBPAGE_TOOLBAR_ORDER.map((id) => (
        <ToolbarButton
          key={id}
          enabled
          label={TOOLBAR_LABELS[id]}
          icon={ICONS[id]}
          onPress={handlers[id]}
          badge={id === 'tabs' ? tabCount : undefined}
          active={id === 'tabs' ? isPrivate : false}
          activeColor={colors.accent}
          dimColor={colors.text}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, paddingTop: 6, paddingBottom: 10 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, minHeight: 58, minWidth: 44 },
  iconWrap: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  badge: { position: 'absolute', top: 4, right: 14, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

export const BottomToolbar = memo(BottomToolbarInner);
