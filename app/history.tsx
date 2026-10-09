import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabs } from '../src/browser/TabContext';
import { EmptyState, ScreenHeader } from '../src/components/ui';
import { useSettings } from '../src/settings/SettingsContext';
import { useTheme } from '../src/theme/ThemeContext';
import { clearHistory, deleteHistoryItem, getHistory, searchHistory } from '../src/storage/database';
import type { HistoryItem } from '../src/types';
import { formatTime } from '../src/utils/helpers';

const PAGE = 100;

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const { settings } = useSettings();
  const { navigateActive } = useTabs();
  const historyOn = settings.saveBrowsingHistory && !settings.privacyMode;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (reset = true) => {
      const off = reset ? 0 : offset;
      const next = query.trim() ? await searchHistory(query) : await getHistory(PAGE, off);
      if (query.trim()) {
        setItems(next);
        setHasMore(false);
      } else if (reset) {
        setItems(next);
        setOffset(PAGE);
        setHasMore(next.length === PAGE);
      } else {
        setItems((prev) => [...prev, ...next]);
        setOffset(off + PAGE);
        setHasMore(next.length === PAGE);
      }
    },
    [offset, query],
  );

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!historyOn) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ScreenHeader title="History" onBack={() => router.back()} />
        <EmptyState
          icon="time-outline"
          title="History is disabled"
          message="Orizen is not saving the websites you visit. Searches are never saved, with or without history."
          actionLabel="Privacy settings"
          onAction={() => router.push('/settings')}
        />
        <View style={{ height: insets.bottom }} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenHeader
        title="History"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() =>
              Alert.alert('Clear all history?', 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => void clearHistory().then(() => void load(true)) },
              ])
            }
            hitSlop={12}
            accessibilityLabel="Clear history"
            accessibilityRole="button"
            style={styles.clearBtn}
          >
            <Text style={[styles.clear, { color: colors.danger }]}>Clear</Text>
          </Pressable>
        }
      />
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search visited pages"
          placeholderTextColor={colors.textMuted}
          style={[styles.search, { color: colors.text }]}
          accessibilityLabel="Search history"
        />
      </View>
      <Text style={[styles.note, { color: colors.textMuted }]}>Only visited pages are listed here. Searches are never saved.</Text>
      {items.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No history yet"
          message="Pages you visit will appear here. Only the title, URL and visit time are stored."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          initialNumToRender={40}
          windowSize={7}
          onEndReached={() => {
            if (hasMore && !query.trim()) void load(false);
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  navigateActive(item.url, item.title);
                  router.back();
                }}
                accessibilityLabel={`Open ${item.title}`}
                accessibilityRole="button"
              >
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title || item.url}
                </Text>
                <Text style={[styles.rowUrl, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.url}
                </Text>
                <Text style={[styles.rowTime, { color: colors.textMuted }]}>{formatTime(item.visitedAt)}</Text>
              </Pressable>
              <Pressable onPress={() => void deleteHistoryItem(item.id).then(() => setItems((p) => p.filter((x) => x.id !== item.id)))} hitSlop={10} accessibilityLabel="Delete history item" accessibilityRole="button" style={styles.delBtn}>
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
  clearBtn: { minWidth: 76, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  clear: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  searchWrap: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center' },
  search: { fontSize: 15, flex: 1 },
  note: { fontSize: 12, marginHorizontal: 18, marginTop: 8, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowUrl: { fontSize: 12, marginTop: 2 },
  rowTime: { fontSize: 11, marginTop: 2 },
  delBtn: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
