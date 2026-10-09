import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabs } from '../src/browser/TabContext';
import { EmptyState, ScreenHeader } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { getBookmarks, removeBookmark, searchBookmarks, updateBookmark } from '../src/storage/database';
import type { Bookmark } from '../src/types';

export default function BookmarksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const { navigateActive, createTab } = useTabs();
  const [items, setItems] = useState<Bookmark[]>([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const load = useCallback(async () => {
    setItems(query.trim() ? await searchBookmarks(query) : await getBookmarks());
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (b: Bookmark) => {
    navigateActive(b.url, b.title);
    router.back();
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenHeader title="Bookmarks" onBack={() => router.back()} />
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search bookmarks"
          placeholderTextColor={colors.textMuted}
          style={[styles.search, { color: colors.text }]}
          accessibilityLabel="Search bookmarks"
        />
      </View>
      {items.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="No bookmarks yet"
          message="Use the bookmark button in the browser menu to save a page here."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          initialNumToRender={30}
          windowSize={7}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Pressable style={{ flex: 1 }} onPress={() => open(item)}>
                {editingId === item.id ? (
                  <TextInput
                    value={editTitle}
                    onChangeText={setEditTitle}
                    onSubmitEditing={() => {
                      void updateBookmark(item.id, { title: editTitle.trim() || item.title }).then(() => {
                        setEditingId(null);
                        void load();
                      });
                    }}
                    style={[styles.editField, { color: colors.text, borderColor: colors.border }]}
                    autoFocus
                  />
                ) : (
                  <>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.rowUrl, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.url}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  createTab(item.url, true);
                  router.back();
                }}
                hitSlop={10}
                accessibilityLabel="Open in new tab"
                accessibilityRole="button"
                style={styles.rowAction}
              >
                <Ionicons name="open-outline" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditingId(item.id);
                  setEditTitle(item.title);
                }}
                hitSlop={10}
                accessibilityLabel="Edit bookmark"
                accessibilityRole="button"
                style={styles.rowAction}
              >
                <Ionicons name="create-outline" size={20} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert('Remove bookmark?', item.title, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => void removeBookmark(item.id).then(() => void load()) },
                  ])
                }
                hitSlop={10}
                accessibilityLabel="Remove bookmark"
                accessibilityRole="button"
                style={styles.rowAction}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          )}
        />
      )}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: { margin: 16, borderWidth: 1, paddingHorizontal: 14, height: 48, flexDirection: 'row', alignItems: 'center' },
  search: { fontSize: 15, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowUrl: { fontSize: 12, marginTop: 2 },
  rowAction: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  editField: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, height: 38 },
});
