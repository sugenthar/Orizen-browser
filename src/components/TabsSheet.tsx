import { Ionicons } from '@expo/vector-icons';
import React, { memo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { displayHost } from '../search/searchService';
import type { BrowserTab, ClosedTab, TabMode } from '../types';
import { isNewTabUrl } from '../types';
import { domainInitial } from '../utils/helpers';
import { tap } from '../utils/haptics';
import { SheetHandle } from './ui';

interface Props {
  visible: boolean;
  tabs: BrowserTab[];
  activeTabId: string;
  initialMode: TabMode;
  canReopen: boolean;
  recentlyClosed: ClosedTab[];
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onNew: (mode: TabMode) => void;
  onCloseAll: (mode: TabMode) => void;
  onReopen: () => void;
  onRestoreClosed: (id: string) => void;
  onClearClosed: () => void;
  onDismiss: () => void;
}

function TabsSheetInner({ visible, tabs, activeTabId, initialMode, canReopen, recentlyClosed, onSwitch, onClose, onNew, onCloseAll, onReopen, onRestoreClosed, onClearClosed, onDismiss }: Props) {
  const { colors, radius, weight } = useTheme();
  const [segment, setSegment] = useState<TabMode>(initialMode);
  const shown = tabs.filter((t) => t.mode === segment);
  const isPrivate = segment === 'private';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
          <SheetHandle />
          <View style={[styles.segWrap, { backgroundColor: colors.surface2, borderRadius: radius.lg }]}>
            {(['normal', 'private'] as TabMode[]).map((m) => {
              const selected = segment === m;
              const count = tabs.filter((t) => t.mode === m).length;
              return (
                <Pressable
                  key={m}
                  onPress={() => setSegment(m)}
                  style={[styles.seg, selected && { backgroundColor: colors.surface, borderRadius: radius.md - 2 }]}
                  accessibilityLabel={m === 'normal' ? 'Normal tabs' : 'Private tabs'}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  {m === 'private' && <Ionicons name="eye-off" size={15} color={selected ? colors.accent : colors.textMuted} style={{ marginRight: 5 }} />}
                  <Text style={[styles.segText, { color: selected ? colors.text : colors.textMuted }]}>
                    {m === 'normal' ? 'Normal' : 'Private'} · {count}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text, fontWeight: weight.bold }]}>
              {isPrivate ? 'Private tabs' : `Tabs (${shown.length})`}
            </Text>
            <View style={styles.headerBtns}>
              {!isPrivate && canReopen && (
                <Pressable onPress={onReopen} hitSlop={10} accessibilityLabel="Reopen closed tab" accessibilityRole="button">
                  <Text style={[styles.link, { color: colors.accent }]}>Reopen</Text>
                </Pressable>
              )}
              <Pressable onPress={() => onNew(segment)} hitSlop={10} accessibilityLabel={isPrivate ? 'New private tab' : 'New tab'} accessibilityRole="button">
                <Text style={[styles.link, { color: colors.accent }]}>+ New</Text>
              </Pressable>
              <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Close tab list" accessibilityRole="button">
                <Text style={[styles.link, { color: colors.textMuted }]}>Done</Text>
              </Pressable>
            </View>
          </View>

          {isPrivate && (
            <View style={[styles.privateNote, { backgroundColor: colors.surface2, borderRadius: radius.md }]}>
              <Ionicons name="eye-off" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <Text style={[styles.privateNoteText, { color: colors.textMuted }]}>
                Private tabs don’t save history or searches on this device.
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.grid}>
            {shown.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name={isPrivate ? 'eye-off' : 'layers'} size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {isPrivate ? 'No private tabs open.' : 'No tabs open.'}
                </Text>
              </View>
            ) : (
              shown.map((t) => {
                const active = t.id === activeTabId;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      tap();
                      onSwitch(t.id);
                    }}
                    style={[
                      styles.card,
                      {
                        backgroundColor: active ? colors.accentSoft : colors.background,
                        borderColor: active ? colors.accent : colors.border,
                        borderRadius: radius.lg,
                        borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                      },
                    ]}
                    accessibilityLabel={`Switch to ${t.title}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.fav, { backgroundColor: colors.surface2 }]}>
                        <Text style={{ color: colors.accent, fontWeight: '800' }}>{domainInitial(t.url)}</Text>
                      </View>
                      {t.mode === 'private' && <Ionicons name="eye-off" size={14} color={colors.textMuted} accessibilityLabel="Private tab" />}
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {isNewTabUrl(t.url) ? (t.mode === 'private' ? 'Private tab' : 'New tab') : t.title || displayHost(t.url)}
                    </Text>
                    {!isNewTabUrl(t.url) && (
                      <Text style={[styles.cardUrl, { color: colors.textMuted }]} numberOfLines={1}>
                        {displayHost(t.url)}
                      </Text>
                    )}
                    <Pressable onPress={() => { tap(); onClose(t.id); }} hitSlop={10} style={styles.close} accessibilityLabel="Close tab" accessibilityRole="button">
                      <Ionicons name="close" size={20} color={colors.textMuted} />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          {shown.length > 1 && (
            <Pressable onPress={() => onCloseAll(segment)} style={[styles.closeAll, { borderColor: colors.border, borderRadius: radius.md }]} accessibilityLabel={isPrivate ? 'Close all private tabs' : 'Close all tabs'} accessibilityRole="button">
              <Text style={[styles.closeAllText, { color: colors.danger }]}>{isPrivate ? 'Close all private tabs' : 'Close all tabs'}</Text>
            </Pressable>
          )}

          {!isPrivate && recentlyClosed.length > 0 && (
            <View style={styles.closedWrap}>
              <View style={styles.closedHeader}>
                <Text style={[styles.closedTitle, { color: colors.textMuted }]}>RECENTLY CLOSED</Text>
                <Pressable onPress={onClearClosed} hitSlop={10} accessibilityLabel="Clear recently closed" accessibilityRole="button">
                  <Text style={[styles.closedClear, { color: colors.danger }]}>Clear</Text>
                </Pressable>
              </View>
              {recentlyClosed.slice(0, 10).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => onRestoreClosed(c.id)}
                  style={[styles.closedRow, { borderBottomColor: colors.border }]}
                  accessibilityLabel={`Reopen ${c.title}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.fav, { backgroundColor: colors.surface2 }]}>
                    <Text style={{ color: colors.accent, fontWeight: '800' }}>{domainInitial(c.url)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {c.title || displayHost(c.url)}
                    </Text>
                    <Text style={[styles.cardUrl, { color: colors.textMuted }]} numberOfLines={1}>
                      {displayHost(c.url)}
                    </Text>
                  </View>
                  <Ionicons name="refresh" size={18} color={colors.accent} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '84%', padding: 16, paddingBottom: 28 },
  segWrap: { flexDirection: 'row', padding: 4, marginBottom: 12 },
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, minHeight: 44 },
  segText: { fontSize: 14, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 19, marginBottom: 12 },
  headerBtns: { flexDirection: 'row', gap: 16 },
  link: { fontSize: 15, fontWeight: '700' },
  privateNote: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 10 },
  privateNoteText: { fontSize: 12, flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  empty: { width: '100%', alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14 },
  card: { width: '48%', borderWidth: 1.5, padding: 12, minHeight: 104 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  fav: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardUrl: { fontSize: 12, marginTop: 2 },
  close: { position: 'absolute', top: 4, right: 4, padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeAll: { borderWidth: 1, paddingVertical: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  closeAllText: { fontWeight: '700' },
  closedWrap: { marginTop: 8 },
  closedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  closedTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  closedClear: { fontSize: 13, fontWeight: '700', padding: 8 },
  closedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10, minHeight: 52 },
});

export const TabsSheet = memo(TabsSheetInner);
