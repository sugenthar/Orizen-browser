import { Ionicons } from '@expo/vector-icons';
import React, { memo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SEARCH_ENGINES } from '../search/searchEngines';
import { useTheme } from '../theme/ThemeContext';
import type { Bookmark, HistoryItem, QuickLink, SearchEngineId } from '../types';
import { domainInitial } from '../utils/helpers';
import { StatusDot } from './ui';
import { Wordmark } from './Wordmark';

interface Props {
  onNavigate: (input: string) => void;
  quickLinks: QuickLink[];
  recent: HistoryItem[];
  bookmarks: Bookmark[];
  historyEnabled: boolean;
  privacyMode: boolean;
  trackerOn: boolean;
  searchEngineId: SearchEngineId;
  onSelectEngine: (id: SearchEngineId) => void;
  onOpenPrivacy: () => void;
  onOpenSettings: () => void;
  onNewPrivateTab: () => void;
  onAddQuickLink: (title: string, url: string) => void;
  onEditQuickLink: (id: string, title: string, url: string) => void;
  onRemoveQuickLink: (id: string) => void;
  onOpenLink: (url: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

function NewTabPageInner({
  onNavigate,
  quickLinks,
  privacyMode,
  searchEngineId,
  onSelectEngine,
  onOpenPrivacy,
  onOpenSettings,
  onAddQuickLink,
  onEditQuickLink,
  onRemoveQuickLink,
  onOpenLink,
  refreshing,
  onRefresh,
}: Props) {
  const { colors, radius, spacing, type } = useTheme();
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuickLink | null>(null);
  const [tTitle, setTTitle] = useState('');
  const [tUrl, setTUrl] = useState('');

  // Responsive shortcut grid: 4 columns on narrow phones, 5 otherwise.
  const columns = width < 360 ? 4 : 5;
  const gap = 12;
  const tileSize = (width - spacing.xl * 2 - gap * (columns - 1)) / columns;

  const openAdd = () => {
    setEditing(null);
    setTTitle('');
    setTUrl('');
    setDialogOpen(true);
  };
  const openEdit = (q: QuickLink) => {
    setEditing(q);
    setTTitle(q.title);
    setTUrl(q.url);
    setDialogOpen(true);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xl }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Compact header: text wordmark only, no graphic logo */}
      <View style={styles.topBar}>
        <Wordmark size={22} />
        <View style={styles.topActions}>
          <Pressable
            onPress={onOpenPrivacy}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel={privacyMode ? 'Privacy Mode on. Open privacy dashboard.' : 'Privacy Mode off. Open privacy dashboard.'}
            accessibilityRole="button"
          >
            <Ionicons name="shield-outline" size={22} color={colors.text} />
            <View style={styles.dotWrap}>
              <StatusDot tone={privacyMode ? 'good' : 'muted'} />
            </View>
          </Pressable>
          <Pressable
            onPress={onOpenSettings}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Balanced spacing keeps the search field in the upper middle */}
      <View style={styles.heroSpace} />

      {/* Search / address field */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24 }]}>
        <Ionicons name="search" size={19} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => {
            if (draft.trim()) onNavigate(draft);
          }}
          returnKeyType="go"
          placeholder="Search or enter address"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text, fontSize: type.body }]}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search or enter address"
          accessibilityHint="Search terms are never saved"
        />
        {draft.length > 0 && (
          <Pressable onPress={() => setDraft('')} hitSlop={10} accessibilityLabel="Clear search" accessibilityRole="button">
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Search engine selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.engines} keyboardShouldPersistTaps="handled">
        {SEARCH_ENGINES.map((e) => {
          const active = e.id === searchEngineId;
          return (
            <Pressable
              key={e.id}
              onPress={() => onSelectEngine(e.id)}
              style={[
                styles.engine,
                {
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : 'transparent',
                  borderRadius: radius.md,
                },
              ]}
              accessibilityLabel={`Search with ${e.name}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {active && <Ionicons name="checkmark" size={14} color={colors.accent} style={{ marginRight: 4 }} />}
              <Text style={[styles.engineText, { color: active ? colors.accent : colors.textMuted }]}>{e.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Shortcuts */}
      {quickLinks.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textMuted, fontSize: type.body }]}>
            No shortcuts yet.
          </Text>
          <Pressable onPress={openAdd} style={[styles.addLink, { borderColor: colors.border, borderRadius: radius.md }]} accessibilityLabel="Add shortcut" accessibilityRole="button">
            <Ionicons name="add" size={18} color={colors.accent} />
            <Text style={[styles.addLinkText, { color: colors.accent, fontSize: type.body }]}>Add shortcut</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.grid, { gap }]}>
          {quickLinks.map((q) => (
            <Pressable
              key={q.id}
              onPress={() => onOpenLink(q.url)}
              onLongPress={() => openEdit(q)}
              delayLongPress={450}
              style={[styles.tile, { width: tileSize }]}
              accessibilityLabel={`Open ${q.title}`}
              accessibilityHint="Long press to edit"
              accessibilityRole="button"
            >
              <View style={[styles.tileIcon, { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.tileLetter, { color: colors.textMuted }]}>{domainInitial(q.url)}</Text>
              </View>
              <Text style={[styles.tileTitle, { color: colors.text, fontSize: type.caption }]} numberOfLines={1}>
                {q.title}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={openAdd}
            style={[styles.tile, { width: tileSize }]}
            accessibilityLabel="Add shortcut"
            accessibilityRole="button"
          >
            <View style={[styles.tileIcon, styles.addTile, { borderColor: colors.border }]}>
              <Ionicons name="add" size={22} color={colors.textMuted} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.textMuted, fontSize: type.caption }]} numberOfLines={1}>
              Add
            </Text>
          </Pressable>
        </View>
      )}
      {quickLinks.length > 0 && (
        <Text style={[styles.tileHint, { color: colors.textMuted, fontSize: type.caption }]}>Long-press a shortcut to edit or remove it.</Text>
      )}

      <Modal visible={dialogOpen} transparent animationType="fade" onRequestClose={() => setDialogOpen(false)}>
        <View style={[styles.modalWrap, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: type.heading }]}>{editing ? 'Edit shortcut' : 'Add shortcut'}</Text>
            <TextInput
              value={tTitle}
              onChangeText={setTTitle}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              style={[styles.field, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, fontSize: type.body }]}
              accessibilityLabel="Shortcut name"
            />
            <TextInput
              value={tUrl}
              onChangeText={setTUrl}
              placeholder="https://example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[styles.field, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, fontSize: type.body }]}
              accessibilityLabel="Shortcut address"
            />
            <View style={styles.modalRow}>
              {editing && (
                <Pressable
                  onPress={() => {
                    onRemoveQuickLink(editing.id);
                    setDialogOpen(false);
                  }}
                  style={[styles.mBtn, { borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1 }]}
                  accessibilityLabel="Remove shortcut"
                  accessibilityRole="button"
                >
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>Remove</Text>
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setDialogOpen(false)} style={[styles.mBtn, { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1 }]} accessibilityLabel="Cancel" accessibilityRole="button">
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!tUrl.trim()) return;
                  if (editing) onEditQuickLink(editing.id, tTitle.trim() || tUrl.trim(), tUrl.trim());
                  else onAddQuickLink(tTitle.trim() || tUrl.trim(), tUrl.trim());
                  setDialogOpen(false);
                }}
                style={[styles.mBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]}
                accessibilityLabel="Save shortcut"
                accessibilityRole="button"
              >
                <Text style={{ color: colors.onAccent, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginBottom: 8 },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dotWrap: { position: 'absolute', top: 8, right: 8 },
  heroSpace: { height: 64 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, height: 52 },
  searchInput: { flex: 1, height: '100%' },
  engines: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingBottom: 4, alignSelf: 'center' },
  engine: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, minHeight: 40 },
  engineText: { fontSize: 13, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: 36 },
  emptyText: { marginBottom: 12 },
  addLink: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, gap: 6 },
  addLinkText: { fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 28 },
  tile: { alignItems: 'center', paddingVertical: 6 },
  tileIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileLetter: { fontSize: 20, fontWeight: '700' },
  addTile: { borderWidth: 1, borderStyle: 'dashed' },
  tileTitle: { fontWeight: '500' },
  tileHint: { marginTop: 10, textAlign: 'center' },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { width: '100%', maxWidth: 380, padding: 20 },
  modalTitle: { fontWeight: '700', marginBottom: 12 },
  field: { borderWidth: 1, paddingHorizontal: 12, height: 48, marginBottom: 10 },
  modalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  mBtn: { paddingHorizontal: 18, paddingVertical: 11, minHeight: 44, justifyContent: 'center', marginLeft: 10 },
});

export const NewTabPage = memo(NewTabPageInner);
