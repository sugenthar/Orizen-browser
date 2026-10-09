import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabs } from '../src/browser/TabContext';
import { ScreenHeader, SectionTitle, StatusDot } from '../src/components/ui';
import { CLEAR_PRIVATE_DATA_DESCRIPTION, clearPrivateSessionData } from '../src/privacy/privacyCleanup';
import { resolvePrivacyStatus, type PrivacyStatus } from '../src/privacy/privacyMode';
import { dnsStatusLabel, SECURE_DNS_NOTE, getSecureDnsStatus } from '../src/privacy/secureDns';
import { getTrackerHostCount } from '../src/privacy/trackerProtection';
import { getVpnService, VPN_BACKEND_REQUIRED, vpnStatusLabel, type VPNStatus } from '../src/privacy/vpnService';
import { useSettings } from '../src/settings/SettingsContext';
import { useTheme } from '../src/theme/ThemeContext';

export default function PrivacyDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const { settings, update } = useSettings();
  const { closeAllTabs, clearWebViewCache } = useTabs();
  const [vpnStatus, setVpnStatus] = useState<VPNStatus>('unsupported');
  const [cleanedMsg, setCleanedMsg] = useState<string | null>(null);

  const refreshVpn = useCallback(() => {
    // Always re-read the native service: the UI must never show stale state.
    void getVpnService()
      .getStatus()
      .then(setVpnStatus)
      .catch(() => setVpnStatus('error'));
  }, []);

  useEffect(() => {
    refreshVpn();
  }, [refreshVpn]);

  const status: PrivacyStatus = resolvePrivacyStatus({
    privacyMode: settings.privacyMode,
    saveBrowsingHistory: settings.saveBrowsingHistory,
    trackerProtectionEnabled: settings.trackerProtectionEnabled,
    tabIsPrivate: false,
    vpnStatus,
    dnsStatus: getSecureDnsStatus(settings.secureDnsEnabled),
  });

  const rowStyle = [styles.row, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenHeader title="Privacy" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
          <View style={[styles.shield, { backgroundColor: status.privacyMode ? colors.accent : colors.surface2 }]}>
            <Ionicons name="shield-checkmark" size={30} color={status.privacyMode ? colors.onAccent : colors.textMuted} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Privacy Mode</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            {status.privacyMode ? 'ON — history off, trackers blocked' : 'Off'}
          </Text>
          <Switch
            value={settings.privacyMode}
            onValueChange={(v) => update({ privacyMode: v })}
            accessibilityLabel="Privacy Mode"
          />
        </View>

        <SectionTitle>STATUS</SectionTitle>
        <View style={rowStyle}>
          <View style={styles.statusRow}>
            <StatusDot tone={vpnStatus === 'connected' ? 'good' : 'muted'} />
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>VPN</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>{vpnStatusLabel(vpnStatus)}</Text>
          </View>
          {vpnStatus === 'unsupported' && (
            <Text style={[styles.hint, { color: colors.textMuted }]}>{VPN_BACKEND_REQUIRED}</Text>
          )}
          <View style={styles.statusRow}>
            <StatusDot tone="muted" />
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Secure DNS</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>{dnsStatusLabel(status.secureDnsStatus)}</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{SECURE_DNS_NOTE}</Text>
          <View style={styles.statusRow}>
            <StatusDot tone="good" />
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Cookie Clearing</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>Available</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Cookies clear on demand from Settings. Clearing reports its real outcome and never claims success on failure.
          </Text>
          <View style={styles.statusRow}>
            <StatusDot tone={status.trackerProtection ? 'good' : 'muted'} />
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Trackers</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>
              {status.trackerProtection ? `Blocking (${getTrackerHostCount()} hosts)` : 'Off'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <StatusDot tone={!status.historyEnabled ? 'good' : 'muted'} />
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>History</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>{status.historyEnabled ? 'Saving' : 'Disabled'}</Text>
          </View>
          <View style={styles.statusRow}>
            <StatusDot tone="good" />
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Search History</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>Never Stored</Text>
          </View>
          <View style={styles.statusRow}>
            <StatusDot tone="muted" />
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Fingerprint Protection</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>Limited</Text>
          </View>
        </View>

        <SectionTitle>ACTIONS</SectionTitle>
        <View style={rowStyle}>
          <Pressable
            onPress={() =>
              Alert.alert('Clear private data?', CLEAR_PRIVATE_DATA_DESCRIPTION, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () =>
                    void clearPrivateSessionData({ closePrivateTabs: () => closeAllTabs('private'), clearCache: clearWebViewCache }).then(() =>
                      setCleanedMsg('Private data cleared'),
                    ),
                },
              ])
            }
            style={styles.actionRow}
            accessibilityLabel="Clear private data"
            accessibilityRole="button"
          >
            <Ionicons name="eye-off" size={20} color={colors.accent} style={{ marginRight: 10 }} />
            <Text style={[styles.actionText, { color: colors.text }]}>Clear Private Data</Text>
          </Pressable>
          {cleanedMsg && <Text style={[styles.cleaned, { color: colors.success }]}>{cleanedMsg}</Text>}
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.actionRow}
            accessibilityLabel="Open full settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
            <Text style={[styles.actionText, { color: colors.text }]}>All Settings</Text>
          </Pressable>
        </View>
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          Privacy Mode prevents Orizen from storing your activity. It does not make you anonymous to websites, networks, or providers you use.
        </Text>
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
  hero: { borderWidth: StyleSheet.hairlineWidth, padding: 20, alignItems: 'center', gap: 6 },
  shield: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroSub: { fontSize: 13, marginBottom: 6 },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 16, marginBottom: 6, marginLeft: 4 },
  row: { borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 10 },
  statusLabel: { fontSize: 14, flex: 1 },
  statusValue: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 4, marginBottom: 8, lineHeight: 17 },
  actionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  actionText: { fontSize: 15, fontWeight: '600' },
  cleaned: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  disclaimer: { fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 17 },
});
