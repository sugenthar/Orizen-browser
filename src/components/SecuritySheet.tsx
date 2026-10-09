import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PrivacyStatus } from '../privacy/privacyMode';
import { dnsStatusLabel } from '../privacy/secureDns';
import { isVpnConnected, vpnStatusLabel } from '../privacy/vpnService';
import { useTheme } from '../theme/ThemeContext';
import { SheetHandle } from './ui';

interface Props {
  visible: boolean;
  url: string;
  status: PrivacyStatus;
  onDismiss: () => void;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function StatusRow({ label, value, good, warn }: { label: string; value: string; good?: boolean; warn?: boolean }) {
  const { colors } = useTheme();
  const dot = good ? colors.success : warn ? colors.danger : colors.textMuted;
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[styles.statusLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statusValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

/**
 * Factual connection sheet. HTTPS means encrypted transport to the listed
 * domain — never a claim that the site itself is safe or trustworthy.
 * Every network row reflects a verified state, never an assumed one.
 */
function SecuritySheetInner({ visible, url, status, onDismiss }: Props) {
  const { colors, radius } = useTheme();
  const lower = url.trim().toLowerCase();
  const isHttps = lower.startsWith('https://');
  const isHttp = lower.startsWith('http://') && !isHttps;
  const vpnOn = isVpnConnected(status.vpnStatus);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onDismiss} accessibilityLabel="Close security information">
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <SheetHandle />
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons
                name={isHttps ? 'lock-closed' : isHttp ? 'warning' : 'help-circle'}
                size={24}
                color={isHttps ? colors.success : isHttp ? colors.danger : colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isHttps ? 'Secure connection' : isHttp ? 'Not secure' : 'Local page'}
              </Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                {isHttps
                  ? 'This connection is encrypted.'
                  : isHttp
                    ? 'This connection is not encrypted.'
                    : 'This is a browser page, not a website.'}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.label, { color: colors.textMuted }]}>Domain</Text>
          <Text style={[styles.domain, { color: colors.text }]} numberOfLines={2}>
            {domainOf(url)}
          </Text>
          {isHttps && (
            <Text style={[styles.note, { color: colors.textMuted }]}>
              Encryption protects data in transit. It does not mean the website itself is safe or trustworthy.
            </Text>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatusRow label="Network" value={vpnOn ? 'VPN Connected' : 'VPN Not Connected'} good={vpnOn} />
          <StatusRow label="DNS" value={dnsStatusLabel(status.secureDnsStatus)} />
          <StatusRow label="Trackers" value={status.trackerProtection ? 'Blocking' : 'Off'} good={status.trackerProtection} />
          <StatusRow label="Private session" value={status.privateBrowsing ? 'Active' : 'Off'} good={status.privateBrowsing} />
          <Pressable
            onPress={onDismiss}
            style={[styles.done, { backgroundColor: colors.accent, borderRadius: radius.md }]}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 32 },
  sheet: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  domain: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  note: { fontSize: 12, marginTop: 10, lineHeight: 17 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statusLabel: { fontSize: 14, flex: 1 },
  statusValue: { fontSize: 14, fontWeight: '700' },
  done: { marginTop: 18, paddingVertical: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export const SecuritySheet = memo(SecuritySheetInner);
