import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  url: string;
  message: string;
  onRetry: () => void;
  onHome: () => void;
}

function kindFor(message: string, url: string): { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string } {
  const m = message.toLowerCase();
  const u = url.trim().toLowerCase();
  if (!/^https?:\/\//.test(u) && !u.startsWith('about:')) {
    return { icon: 'link', title: 'Invalid address', hint: 'Check the address for typos and try again.' };
  }
  if (m.includes('internet') || m.includes('offline') || m.includes('name resolution') || m.includes('unknown host') || m.includes('net::')) {
    return { icon: 'cloud-offline', title: 'No internet connection', hint: 'Check your connection and try again.' };
  }
  if (m.includes('ssl') || m.includes('cert') || m.includes('tls')) {
    return { icon: 'lock-closed', title: 'Connection blocked', hint: 'This site presented an invalid security certificate. Orizen blocked the page to protect you.' };
  }
  return { icon: 'warning', title: 'Unable to load this page', hint: 'Check your internet connection and try again.' };
}

function ErrorViewInner({ url, message, onRetry, onHome }: Props) {
  const { colors, radius } = useTheme();
  const kind = kindFor(message, url);
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={kind.icon} size={28} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{kind.title}</Text>
        <Text style={[styles.url, { color: colors.textMuted }]} numberOfLines={2}>
          {url}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{kind.hint}</Text>
        <View style={styles.row}>
          <Pressable onPress={onRetry} style={[styles.btn, { backgroundColor: colors.accent, borderRadius: radius.md }]} accessibilityLabel="Try again" accessibilityRole="button">
            <Ionicons name="reload" size={17} color={colors.onAccent} style={styles.btnIcon} />
            <Text style={[styles.btnText, { color: colors.onAccent }]}>Retry</Text>
          </Pressable>
          <Pressable
            onPress={onHome}
            style={[styles.btn, styles.btnGhost, { borderColor: colors.border, borderRadius: radius.md }]}
            accessibilityLabel="Go home"
            accessibilityRole="button"
          >
            <Ionicons name="home" size={17} color={colors.text} style={styles.btnIcon} />
            <Text style={[styles.btnGhostText, { color: colors.text }]}>Home</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderWidth: StyleSheet.hairlineWidth, padding: 24, alignItems: 'center' },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  url: { fontSize: 13, marginBottom: 8, textAlign: 'center' },
  hint: { fontSize: 13, textAlign: 'center', marginBottom: 18 },
  row: { flexDirection: 'row' },
  btn: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, minWidth: 110, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  btnIcon: { marginRight: 6 },
  btnText: { fontWeight: '700', fontSize: 15 },
  btnGhost: { borderWidth: 1, marginLeft: 10 },
  btnGhostText: { fontWeight: '600', fontSize: 15 },
});

export const ErrorView = memo(ErrorViewInner);
