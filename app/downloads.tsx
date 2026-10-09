import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDownloads } from '../src/downloads/DownloadContext';
import { formatBytes, typeLabel } from '../src/downloads/downloadManager';
import { EmptyState, ScreenHeader } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import type { DownloadRecord, DownloadStatus } from '../src/types';
import { formatTime } from '../src/utils/helpers';

function statusLabel(status: DownloadStatus): string {
  switch (status) {
    case 'downloading':
      return 'Downloading';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Pending';
  }
}

function statusColor(status: DownloadStatus, colors: { success: string; danger: string; textMuted: string; accent: string }): string {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'failed':
      return colors.danger;
    case 'downloading':
      return colors.accent;
    default:
      return colors.textMuted;
  }
}

export default function DownloadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const { records, progress, progressDetail, cancelDownload, removeDownload, openDownload, clearFinished, retryDownload, canRetry } = useDownloads();

  const renderItem = ({ item }: { item: DownloadRecord }) => {
    const active = item.status === 'downloading' || item.status === 'pending';
    const ratio = active ? (progress[item.id] ?? 0) : 1;
    const detail = progressDetail[item.id];
    const sizeLine =
      active && detail && detail.expected > 0
        ? `${formatBytes(detail.written)} of ${formatBytes(detail.expected)}`
        : item.size > 0
          ? formatBytes(item.size)
          : 'Unknown size';
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons
            name={item.status === 'completed' ? 'document-text' : item.status === 'failed' ? 'warning' : 'download'}
            size={22}
            color={statusColor(item.status, colors)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.filename}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {typeLabel(item.filename, item.mimeType)} · {sizeLine} ·{' '}
            <Text style={{ color: statusColor(item.status, colors) }}>{statusLabel(item.status)}</Text>
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{formatTime(item.createdAt)}</Text>
          {active && (
            <View style={[styles.track, { backgroundColor: colors.surface2, borderRadius: 2 }]}>
              <View style={[styles.fill, { backgroundColor: colors.accent, width: `${Math.round(ratio * 100)}%` as unknown as number }]} />
            </View>
          )}
        </View>
        {active ? (
          <Pressable onPress={() => cancelDownload(item.id)} hitSlop={10} style={styles.act} accessibilityLabel="Cancel download" accessibilityRole="button">
            <Ionicons name="close" size={22} color={colors.danger} />
          </Pressable>
        ) : (
          <>
            {item.status === 'completed' && (
              <Pressable onPress={() => openDownload(item.id)} hitSlop={10} style={styles.act} accessibilityLabel="Open downloaded file" accessibilityRole="button">
                <Ionicons name="open-outline" size={22} color={colors.accent} />
              </Pressable>
            )}
            {(item.status === 'failed' || item.status === 'cancelled') && canRetry(item.id) && (
              <Pressable onPress={() => retryDownload(item.id)} hitSlop={10} style={styles.act} accessibilityLabel="Retry download" accessibilityRole="button">
                <Ionicons name="refresh" size={22} color={colors.accent} />
              </Pressable>
            )}
            <Pressable
              onPress={() =>
                Alert.alert('Delete download?', `${item.filename}\nThis also deletes the saved file.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeDownload(item.id) },
                ])
              }
              hitSlop={10}
              style={styles.act}
              accessibilityLabel="Delete download"
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenHeader
        title="Downloads"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() =>
              records.length > 0 &&
              Alert.alert('Clear finished downloads?', 'Completed, failed and cancelled entries and their files will be removed.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearFinished },
              ])
            }
            hitSlop={12}
            accessibilityLabel="Clear finished downloads"
            accessibilityRole="button"
            style={styles.clearBtn}
          >
            <Text style={[styles.clear, { color: colors.danger }]}>Clear</Text>
          </Pressable>
        }
      />
      {records.length === 0 ? (
        <EmptyState
          icon="download-outline"
          title="No downloads yet"
          message="Files you download are saved inside Orizen's private storage on this device and listed here. Use Open to view a file or save it elsewhere — files you share or export are no longer private to Orizen. Downloads never appear in browsing history. Authenticated downloads may fail because Orizen sends no login cookies."
        />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(i) => i.id}
          initialNumToRender={30}
          windowSize={7}
          renderItem={renderItem}
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 3 },
  time: { fontSize: 11, marginTop: 2 },
  track: { height: 4, marginTop: 8, overflow: 'hidden' },
  fill: { height: 4 },
  act: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
