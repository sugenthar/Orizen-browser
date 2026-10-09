import { Ionicons } from '@expo/vector-icons';
import React, { memo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  value: string;
  isPrivate: boolean;
  vpnConnected: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
  loading: boolean;
  progress: number;
  onReload: () => void;
  onStop: () => void;
  onSecurityPress: () => void;
}

function AddressBarInner({ value, isPrivate, vpnConnected, onChange, onSubmit, loading, progress, onReload, onStop, onSecurityPress }: Props) {
  const { colors, radius, type } = useTheme();
  const [focused, setFocused] = useState(false);
  const trimmed = value.trim();
  const isHttps = trimmed.toLowerCase().startsWith('https://');
  const isHttp = trimmed.toLowerCase().startsWith('http://') && !isHttps;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: isPrivate ? colors.surface : colors.surface2,
            borderColor: focused ? colors.accent : colors.border,
            borderWidth: focused ? 1.5 : StyleSheet.hairlineWidth,
            borderRadius: radius.xl,
            shadowColor: focused ? colors.accent : 'transparent',
            shadowOpacity: focused ? 0.18 : 0,
            shadowRadius: focused ? 8 : 0,
            shadowOffset: { width: 0, height: 2 },
            elevation: focused ? 3 : 0,
          },
        ]}
      >
        {trimmed.length === 0 ? (
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.lead} />
        ) : (
          <Pressable onPress={onSecurityPress} hitSlop={10} style={styles.leadBtn} accessibilityLabel="Connection security" accessibilityRole="button">
            {isHttps ? (
              <Ionicons name="lock-closed" size={16} color={colors.success} />
            ) : isHttp ? (
              <Ionicons name="warning" size={16} color={colors.danger} />
            ) : (
              <Ionicons name="search" size={18} color={colors.textMuted} />
            )}
          </Pressable>
        )}
        {isPrivate && <Ionicons name="eye-off" size={16} color={colors.accent} style={styles.lead} accessibilityLabel="Private tab" />}
        {/* Rendered only when a real VPN reports connected — never assumed. */}
        {vpnConnected && <Ionicons name="shield-checkmark" size={16} color={colors.success} style={styles.lead} accessibilityLabel="VPN connected" />}
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType="web-search"
          placeholder="Search or enter address"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, fontSize: type.body }]}
          selectTextOnFocus
          accessibilityLabel="Address bar"
          accessibilityHint="Type a web address or search terms"
        />
        {loading ? (
          <Pressable onPress={onStop} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Stop loading" accessibilityRole="button">
            <ActivityIndicator size="small" color={colors.accent} />
          </Pressable>
        ) : (
          <>
            {value.length > 0 && (
              <Pressable onPress={() => onChange('')} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Clear address" accessibilityRole="button">
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            )}
            <Pressable onPress={onReload} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Reload page" accessibilityRole="button">
              <Ionicons name="reload" size={20} color={colors.textMuted} />
            </Pressable>
          </>
        )}
      </View>
      {loading && progress > 0 && progress < 1 && (
        <View style={[styles.progressTrack, { backgroundColor: colors.accentSoft }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${Math.round(progress * 100)}%` as unknown as number }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 50 },
  lead: { marginRight: 8 },
  leadBtn: { marginRight: 4, padding: 6, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: '100%' },
  iconBtn: { padding: 8, marginLeft: 2, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 3, marginTop: 7, overflow: 'hidden', borderRadius: 2 },
  progressFill: { height: 3, borderRadius: 2 },
});

export const AddressBar = memo(AddressBarInner);
