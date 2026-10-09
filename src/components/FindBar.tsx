import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  term: string;
  matchText: string | null;
  onChange: (term: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

/**
 * Find in Page bar. The term lives in component state only and is never
 * persisted anywhere — it is forgotten when the bar closes.
 */
function FindBarInner({ term, matchText, onChange, onNext, onPrev, onClose }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.toolbar, borderTopColor: colors.border }]}>
      <View style={[styles.field, { backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: radius.md }]}>
        <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          value={term}
          onChangeText={onChange}
          onSubmitEditing={onNext}
          returnKeyType="search"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Find in page"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          accessibilityLabel="Find in page"
          accessibilityHint="Search text is not saved"
        />
        {matchText && (
          <Text style={[styles.count, { color: colors.textMuted }]}>{matchText}</Text>
        )}
      </View>
      <Pressable onPress={onPrev} hitSlop={8} style={styles.btn} accessibilityLabel="Previous match" accessibilityRole="button">
        <Ionicons name="chevron-up" size={22} color={colors.text} />
      </Pressable>
      <Pressable onPress={onNext} hitSlop={8} style={styles.btn} accessibilityLabel="Next match" accessibilityRole="button">
        <Ionicons name="chevron-down" size={22} color={colors.text} />
      </Pressable>
      <Pressable onPress={onClose} hitSlop={8} style={styles.btn} accessibilityLabel="Close find in page" accessibilityRole="button">
        <Ionicons name="close" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingVertical: 6 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, height: 44 },
  input: { flex: 1, fontSize: 15 },
  count: { fontSize: 12, marginLeft: 6 },
  btn: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});

export const FindBar = memo(FindBarInner);
