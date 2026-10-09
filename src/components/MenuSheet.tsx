import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SheetHandle } from './ui';

export interface MenuAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  hint?: string;
  disabled?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: MenuAction[];
  onSelect: (id: string) => void;
  onDismiss: () => void;
}

function MenuSheetInner({ visible, title, actions, onSelect, onDismiss }: Props) {
  const { colors, radius } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onDismiss} accessibilityLabel="Close menu">
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <SheetHandle />
          {title ? (
            <Text style={[styles.title, { color: colors.textMuted, borderBottomColor: colors.border }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          <ScrollView>
            {actions.map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => {
                  if (!a.disabled) onSelect(a.id);
                }}
                disabled={a.disabled}
                style={[styles.row, i === actions.length - 1 && styles.lastRow, { borderBottomColor: colors.border, opacity: a.disabled ? 0.35 : 1 }]}
                accessibilityLabel={a.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: a.disabled === true }}
              >
                <Ionicons name={a.icon} size={22} color={a.danger ? colors.danger : colors.text} style={styles.icon} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: a.danger ? colors.danger : colors.text }]}>{a.label}</Text>
                  {a.hint && (
                    <Text style={[styles.hint, { color: colors.textMuted }]}>{a.hint}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 32 },
  sheet: { maxHeight: '70%', paddingVertical: 8, paddingHorizontal: 6 },
  title: { fontSize: 13, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 52 },
  lastRow: { borderBottomWidth: 0 },
  icon: { width: 30, textAlign: 'center', marginRight: 12 },
  label: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 2 },
});

export const MenuSheet = memo(MenuSheetInner);
