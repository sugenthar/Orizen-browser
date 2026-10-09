import { Ionicons } from '@expo/vector-icons';
import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PRIVATE_BROWSING_DISCLAIMER, PRIVATE_BROWSING_MESSAGE } from '../privacy/privacyService';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  onNavigate: (input: string) => void;
  onClosePrivate: () => void;
}

function PrivateNewTabPageInner({ onNavigate, onClosePrivate }: Props) {
  const { colors, radius, weight } = useTheme();
  const [draft, setDraft] = useState('');

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={[styles.badge, { backgroundColor: colors.surface2, borderRadius: radius.md }]}>
        <Ionicons name="eye-off" size={16} color={colors.accent} style={{ marginRight: 6 }} />
        <Text style={[styles.badgeText, { color: colors.text }]}>Private</Text>
      </View>
      <Text style={[styles.title, { color: colors.text, fontWeight: weight.bold }]}>Private Browsing</Text>
      <Text style={[styles.msg, { color: colors.textMuted }]}>{PRIVATE_BROWSING_MESSAGE}</Text>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => {
            if (draft.trim()) onNavigate(draft);
          }}
          returnKeyType="go"
          placeholder="Search or enter address"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Private tab search"
          accessibilityHint="Search terms are never saved"
        />
      </View>

      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>{PRIVATE_BROWSING_DISCLAIMER}</Text>
      <Text style={[styles.bookmarkNote, { color: colors.textMuted }]}>
        Bookmarks you explicitly save while private are kept — everything else is forgotten when the tab closes.
      </Text>

      <Pressable
        onPress={onClosePrivate}
        style={[styles.closeBtn, { borderColor: colors.border, borderRadius: radius.md }]}
        accessibilityLabel="Close private tab"
        accessibilityRole="button"
      >
        <Text style={[styles.closeText, { color: colors.text }]}>Close private tab</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 48 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16 },
  badgeText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 26, marginBottom: 8 },
  msg: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 16, height: 54, width: '100%', marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 16 },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 8 },
  bookmarkNote: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  closeBtn: { borderWidth: 1, paddingHorizontal: 22, paddingVertical: 12, minHeight: 48, justifyContent: 'center' },
  closeText: { fontWeight: '700', fontSize: 15 },
});

export const PrivateNewTabPage = memo(PrivateNewTabPageInner);
