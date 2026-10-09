import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { defaultDecision, describeDecision, type SitePermission } from '../src/permissions/sitePermissions';
import { useSitePermissions } from '../src/permissions/SitePermissionContext';
import { ScreenHeader, SectionTitle } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';

interface GlobalRow {
  permission: SitePermission;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  state: string;
  explanation: string;
}

const GLOBAL_ROWS: GlobalRow[] = [
  {
    permission: 'camera',
    title: 'Camera',
    icon: 'camera-outline',
    state: 'System prompt',
    explanation:
      'When a website requests the camera, Android/iOS asks you first. Orizen never grants access silently. Deny the system prompt to refuse; manage granted access in system settings.',
  },
  {
    permission: 'microphone',
    title: 'Microphone',
    icon: 'mic-outline',
    state: 'System prompt',
    explanation:
      'When a website requests the microphone, Android/iOS asks you first. Orizen never grants access silently. Deny the system prompt to refuse; manage granted access in system settings.',
  },
  {
    permission: 'location',
    title: 'Location',
    icon: 'location-outline',
    state: 'Blocked',
    explanation:
      'Orizen disables WebView location for every site. Pages cannot request your location. This cannot be changed per site.',
  },
  {
    permission: 'fileUpload',
    title: 'File uploads',
    icon: 'document-attach-outline',
    state: 'System picker',
    explanation:
      'File inputs open the operating-system picker. Only files you explicitly choose are shared with the site; cancelled or denied picks fail safely.',
  },
  {
    permission: 'notifications',
    title: 'Notifications',
    icon: 'notifications-outline',
    state: 'Not supported',
    explanation:
      'Web push notifications are not available inside the system WebView, so websites cannot subscribe you to notifications through Orizen.',
  },
];

export default function SitePermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const { trackerExceptions, revokeSite, clearAll } = useSitePermissions();

  const rowStyle = [styles.row, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenHeader title="Site Permissions" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>WEBSITE ACCESS</SectionTitle>
        {GLOBAL_ROWS.map((row) => (
          <View key={row.permission} style={rowStyle}>
            <View style={styles.rowHead}>
              <Ionicons name={row.icon} size={20} color={colors.text} style={{ marginRight: 10 }} />
              <Text style={[styles.rowTitle, { color: colors.text }]}>{row.title}</Text>
              <View style={[styles.badge, { backgroundColor: colors.surface2, borderRadius: radius.md }]}>
                <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                  {row.permission === 'camera' || row.permission === 'microphone'
                    ? describeDecision(defaultDecision(row.permission))
                    : row.state}
                </Text>
              </View>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted }]}>{row.explanation}</Text>
            {(row.permission === 'camera' || row.permission === 'microphone') && (
              <Pressable
                onPress={() => void Linking.openSettings().catch(() => {})}
                style={[styles.sysBtn, { borderColor: colors.border, borderRadius: radius.md }]}
                accessibilityLabel="Open system settings"
                accessibilityRole="button"
              >
                <Text style={[styles.sysText, { color: colors.accent }]}>Manage in system settings</Text>
              </Pressable>
            )}
          </View>
        ))}

        <SectionTitle>SAVED WEBSITE DECISIONS</SectionTitle>
        <View style={rowStyle}>
          {trackerExceptions.length === 0 ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              No saved decisions. When tracker protection blocks a page, the browser menu offers an explicit per-site exception; exceptions appear here and can be revoked at any time. Camera, microphone and location follow the OS-level behavior above and are managed in system settings.
            </Text>
          ) : (
            trackerExceptions.map((rec) => (
              <View key={`${rec.origin}|${rec.permission}`} style={[styles.exRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exOrigin, { color: colors.text }]} numberOfLines={1}>
                    {rec.origin}
                  </Text>
                  <Text style={[styles.exSub, { color: colors.textMuted }]}>Trackers allowed on this site</Text>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert('Revoke exception?', `${rec.origin}\nTracker protection will apply to this site again.`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Revoke', style: 'destructive', onPress: () => revokeSite(rec.origin, rec.permission) },
                    ])
                  }
                  hitSlop={10}
                  style={styles.revokeBtn}
                  accessibilityLabel={`Revoke exception for ${rec.origin}`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.revokeText, { color: colors.danger }]}>Revoke</Text>
                </Pressable>
              </View>
            ))
          )}
          {trackerExceptions.length > 0 && (
            <Pressable
              onPress={() =>
                Alert.alert('Clear all site decisions?', 'All saved tracker exceptions will be removed.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: clearAll },
                ])
              }
              style={[styles.clearBtn, { borderColor: colors.border, borderRadius: radius.md }]}
              accessibilityLabel="Clear all site decisions"
              accessibilityRole="button"
            >
              <Text style={[styles.clearText, { color: colors.danger }]}>Clear all site decisions</Text>
            </Pressable>
          )}
        </View>
        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 76, minHeight: 44 },
  back: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16 },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 6, marginLeft: 4 },
  row: { borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 8 },
  rowHead: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  sysBtn: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center', marginTop: 10, alignSelf: 'flex-start' },
  sysText: { fontWeight: '700', fontSize: 14 },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  exOrigin: { fontSize: 14, fontWeight: '600' },
  exSub: { fontSize: 12, marginTop: 2 },
  revokeBtn: { padding: 10, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  revokeText: { fontWeight: '700', fontSize: 14 },
  clearBtn: { borderWidth: 1, paddingVertical: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  clearText: { fontWeight: '700' },
});
