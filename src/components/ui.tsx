import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Shared Orizen UI primitives. Visual only — no browser logic lives here.
 * Every screen uses these for headers, empty states, sections and sheets so
 * spacing, typography and touch targets stay consistent.
 */

export const ScreenHeader = memo(function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const { colors, spacing, weight } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.lg }]}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityLabel="Back"
        accessibilityRole="button"
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={24} color={colors.accent} />
        <Text style={[styles.back, { color: colors.accent, fontWeight: weight.semibold }]}>Back</Text>
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.text, fontWeight: weight.bold }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRight}>{right ?? <View style={{ width: 76 }} />}</View>
    </View>
  );
});

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors, radius, type } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={icon} size={30} color={colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text, fontSize: type.heading }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: colors.textMuted, fontSize: type.body }]}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={[styles.emptyCta, { backgroundColor: colors.accent, borderRadius: radius.md }]}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
        >
          <Text style={styles.emptyCtaText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});

export const SectionTitle = memo(function SectionTitle({ children }: { children: string }) {
  const { colors, spacing, type } = useTheme();
  return (
    <Text style={[{ color: colors.textMuted, fontSize: type.caption, marginLeft: spacing.sm - 2 }, styles.section]}>
      {children.toUpperCase()}
    </Text>
  );
});

export const SheetHandle = memo(function SheetHandle() {
  const { colors } = useTheme();
  return (
    <View style={styles.handleWrap} accessibilityElementsHidden>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
    </View>
  );
});

export const StatusDot = memo(function StatusDot({ tone }: { tone: 'good' | 'bad' | 'muted' }) {
  const { colors } = useTheme();
  const color = tone === 'good' ? colors.success : tone === 'bad' ? colors.danger : colors.textMuted;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 76, minHeight: 44 },
  back: { fontSize: 16 },
  headerTitle: { fontSize: 18, flex: 1, textAlign: 'center' },
  headerRight: { width: 76, alignItems: 'flex-end', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub: { textAlign: 'center', lineHeight: 20 },
  emptyCta: { paddingHorizontal: 22, paddingVertical: 12, minHeight: 48, justifyContent: 'center', marginTop: 16 },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  section: { fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
