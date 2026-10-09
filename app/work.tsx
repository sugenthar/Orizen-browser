import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader, SectionTitle } from '../src/components/ui';
import {
  LIST_SUGGESTIONS,
  filterTasks,
  isValidDueDate,
  listName,
  normalizeDueDate,
  offsetKey,
  sortTasks,
  taskCounts,
  todayKey,
  validateListName,
  validateTaskInput,
  type TaskFilter,
  type TaskSort,
} from '../src/work/tasks';
import {
  deleteTask,
  deleteTaskList,
  insertTask,
  insertTaskList,
  listTaskLists,
  listTasks,
  renameTaskList,
  updateTask,
} from '../src/storage/database';
import { useTheme } from '../src/theme/ThemeContext';
import type { TaskList, TaskPriority, TaskRecord } from '../src/types';
import { newId } from '../src/utils/helpers';

const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high'];

interface TaskDraft {
  id: string | null;
  title: string;
  notes: string;
  dueDate: string;
  priority: TaskPriority;
  listId: string | null;
  error: string | null;
}

const EMPTY_DRAFT: TaskDraft = { id: null, title: '', notes: '', dueDate: '', priority: 'normal', listId: null, error: null };

export default function WorkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius, type } = useTheme();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('created');
  const [query, setQuery] = useState('');
  const [listFilter, setListFilter] = useState<string | 'all'>('all');
  const [taskDialog, setTaskDialog] = useState<TaskDraft | null>(null);
  const [listDialog, setListDialog] = useState<{ id: string | null; name: string; error: string | null } | null>(null);

  const refresh = useCallback(() => {
    void Promise.all([listTasks(), listTaskLists()])
      .then(([t, l]) => {
        setTasks(t);
        setLists(l);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(() => taskCounts(tasks), [tasks]);
  const visible = useMemo(() => {
    const filtered = filterTasks(tasks, filter, query).filter((t) => listFilter === 'all' || t.listId === listFilter);
    return sortTasks(filtered, sort);
  }, [tasks, filter, query, listFilter, sort]);

  const toggleComplete = (task: TaskRecord) => {
    const next: TaskRecord = { ...task, completed: !task.completed, updatedAt: Date.now() };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? next : t)));
    void updateTask(next).then(() => refresh());
  };

  const saveTask = async () => {
    if (!taskDialog) return;
    const checked = validateTaskInput({ title: taskDialog.title, dueDate: taskDialog.dueDate });
    if ('error' in checked) {
      setTaskDialog({ ...taskDialog, error: checked.error });
      return;
    }
    const due = normalizeDueDate(taskDialog.dueDate);
    if (taskDialog.id) {
      const existing = tasks.find((t) => t.id === taskDialog.id);
      if (!existing) {
        setTaskDialog(null);
        return;
      }
      const next: TaskRecord = {
        ...existing,
        title: checked.title,
        notes: taskDialog.notes.trim().slice(0, 2000),
        dueDate: due,
        priority: taskDialog.priority,
        listId: taskDialog.listId,
        updatedAt: Date.now(),
      };
      await updateTask(next);
    } else {
      const now = Date.now();
      await insertTask({
        id: newId('task'),
        title: checked.title,
        notes: taskDialog.notes.trim().slice(0, 2000),
        dueDate: due,
        priority: taskDialog.priority,
        listId: taskDialog.listId,
        completed: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    setTaskDialog(null);
    refresh();
  };

  const confirmDeleteTask = (task: TaskRecord) => {
    Alert.alert('Delete task?', `"${task.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteTask(task.id).then(() => refresh()) },
    ]);
  };

  const saveList = async () => {
    if (!listDialog) return;
    const checked = validateListName(listDialog.name, lists, listDialog.id ?? undefined);
    if ('error' in checked) {
      setListDialog({ ...listDialog, error: checked.error });
      return;
    }
    if (listDialog.id) await renameTaskList(listDialog.id, checked.name);
    else await insertTaskList({ id: newId('list'), name: checked.name, createdAt: Date.now() });
    setListDialog(null);
    refresh();
  };

  const confirmDeleteList = (list: TaskList) => {
    const affected = tasks.filter((t) => t.listId === list.id && !t.completed).length;
    Alert.alert(
      'Delete list?',
      `"${list.name}" will be removed.${affected > 0 ? ` Its ${affected} active task${affected === 1 ? '' : 's'} will be kept as unlisted tasks — nothing is deleted with the list.` : ' Its tasks (if any) stay as unlisted tasks.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete list', style: 'destructive', onPress: () => void deleteTaskList(list.id).then(() => {
          if (listFilter === list.id) setListFilter('all');
          refresh();
        }) },
      ],
    );
  };

  const filters: Array<{ id: TaskFilter; label: string; count: number }> = [
    { id: 'today', label: 'Today', count: counts.today },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { id: 'all', label: 'All Tasks', count: counts.all },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];
  const sorts: Array<{ id: TaskSort; label: string }> = [
    { id: 'created', label: 'Newest' },
    { id: 'due', label: 'Due date' },
    { id: 'priority', label: 'Priority' },
  ];

  const priorityColor = (p: TaskPriority) =>
    p === 'high' ? colors.danger : p === 'low' ? colors.textMuted : colors.accent;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScreenHeader
        title="Work"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() => setTaskDialog({ ...EMPTY_DRAFT })}
            hitSlop={10}
            style={[styles.addBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]}
            accessibilityLabel="Add task"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color={colors.onAccent} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks"
            placeholderTextColor={colors.textMuted}
            style={[styles.search, { color: colors.text }]}
            accessibilityLabel="Search tasks"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search" accessibilityRole="button">
              <Ionicons name="close-circle" size={19} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {filters.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, { borderColor: filter === f.id ? colors.accent : colors.border, backgroundColor: filter === f.id ? colors.accentSoft : 'transparent', borderRadius: radius.md }]}
              accessibilityLabel={`Show ${f.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.id }}
            >
              <Text style={[styles.chipText, { color: filter === f.id ? colors.accent : colors.text }]}>
                {f.label} · {f.count}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {sorts.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSort(s.id)}
              style={[styles.sortChip, { borderColor: sort === s.id ? colors.accent : colors.border, borderRadius: radius.md }]}
              accessibilityLabel={`Sort by ${s.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === s.id }}
            >
              <Text style={[styles.sortText, { color: sort === s.id ? colors.accent : colors.textMuted }]}>Sort: {s.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {visible.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={filter === 'completed' ? 'checkmark-done' : 'checkbox-outline'}
              title={
                tasks.length === 0
                  ? 'No tasks yet'
                  : filter === 'completed'
                    ? 'Nothing completed'
                    : 'Nothing here'
              }
              message={
                tasks.length === 0
                  ? 'Add your first task with the + button. Everything stays on this device.'
                  : 'Try a different filter or search.'
              }
              actionLabel={tasks.length === 0 ? 'Add task' : undefined}
              onAction={tasks.length === 0 ? () => setTaskDialog({ ...EMPTY_DRAFT }) : undefined}
            />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            {visible.map((t, i) => (
              <View key={t.id} style={[styles.taskRow, i === visible.length - 1 && styles.lastRow, { borderBottomColor: colors.border }]}>
                <Pressable
                  onPress={() => toggleComplete(t)}
                  hitSlop={8}
                  style={styles.check}
                  accessibilityLabel={t.completed ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: t.completed }}
                >
                  <Ionicons name={t.completed ? 'checkbox' : 'square-outline'} size={24} color={t.completed ? colors.success : colors.textMuted} />
                </Pressable>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() =>
                    setTaskDialog({ id: t.id, title: t.title, notes: t.notes, dueDate: t.dueDate ?? '', priority: t.priority, listId: t.listId, error: null })
                  }
                  accessibilityLabel={`Edit ${t.title}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.taskTitle, { color: t.completed ? colors.textMuted : colors.text, fontSize: type.body, textDecorationLine: t.completed ? 'line-through' : 'none' }]}
                    numberOfLines={2}
                  >
                    {t.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {t.dueDate && (
                      <Text style={[styles.meta, { color: colors.textMuted, fontSize: type.caption }]}>{t.dueDate}</Text>
                    )}
                    <Text style={[styles.meta, { color: priorityColor(t.priority), fontSize: type.caption }]}>
                      {t.priority === 'high' ? 'High' : t.priority === 'low' ? 'Low' : 'Normal'}
                    </Text>
                    {t.listId && (
                      <Text style={[styles.meta, { color: colors.textMuted, fontSize: type.caption }]} numberOfLines={1}>
                        {listName(lists, t.listId)}
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Pressable onPress={() => confirmDeleteTask(t)} hitSlop={10} style={styles.miniBtn} accessibilityLabel={`Delete ${t.title}`} accessibilityRole="button">
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <SectionTitle>CUSTOM LISTS</SectionTitle>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Pressable
            onPress={() => setListFilter('all')}
            style={[styles.listRow, { borderBottomColor: colors.border }]}
            accessibilityLabel="Show all lists"
            accessibilityRole="button"
          >
            <Ionicons name={listFilter === 'all' ? 'radio-button-on' : 'radio-button-off'} size={20} color={listFilter === 'all' ? colors.accent : colors.textMuted} style={{ marginRight: 10 }} />
            <Text style={[styles.listName, { color: colors.text, fontSize: type.body }]}>All lists</Text>
          </Pressable>
          {lists.map((l) => {
            const n = tasks.filter((t) => t.listId === l.id && !t.completed).length;
            return (
              <View key={l.id} style={[styles.listRow, { borderBottomColor: colors.border }]}>
                <Pressable
                  onPress={() => setListFilter(listFilter === l.id ? 'all' : l.id)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                  accessibilityLabel={`Filter by ${l.name}`}
                  accessibilityRole="button"
                >
                  <Ionicons name={listFilter === l.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={listFilter === l.id ? colors.accent : colors.textMuted} style={{ marginRight: 10 }} />
                  <Text style={[styles.listName, { color: colors.text, fontSize: type.body }]} numberOfLines={1}>
                    {l.name} · {n}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setListDialog({ id: l.id, name: l.name, error: null })} hitSlop={10} style={styles.miniBtn} accessibilityLabel={`Rename ${l.name}`} accessibilityRole="button">
                  <Ionicons name="create-outline" size={19} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => confirmDeleteList(l)} hitSlop={10} style={styles.miniBtn} accessibilityLabel={`Delete ${l.name}`} accessibilityRole="button">
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                </Pressable>
              </View>
            );
          })}
          <Pressable
            onPress={() => setListDialog({ id: null, name: '', error: null })}
            style={[styles.listRow, styles.lastRow]}
            accessibilityLabel="New list"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color={colors.accent} style={{ marginRight: 10 }} />
            <Text style={[styles.listName, { color: colors.accent, fontSize: type.body }]}>New list</Text>
          </Pressable>
        </View>
        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>

      {/* Task dialog */}
      <Modal visible={taskDialog !== null} transparent animationType="fade" onRequestClose={() => setTaskDialog(null)}>
        <View style={[styles.modalWrap, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: type.heading }]}>
                {taskDialog?.id ? 'Edit task' : 'New task'}
              </Text>
              <TextInput
                value={taskDialog?.title ?? ''}
                onChangeText={(v) => taskDialog && setTaskDialog({ ...taskDialog, title: v })}
                placeholder="Title (required)"
                placeholderTextColor={colors.textMuted}
                style={[styles.field, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, fontSize: type.body }]}
                accessibilityLabel="Task title"
              />
              <TextInput
                value={taskDialog?.notes ?? ''}
                onChangeText={(v) => taskDialog && setTaskDialog({ ...taskDialog, notes: v })}
                placeholder="Notes (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.field, styles.notesField, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, fontSize: type.body }]}
                accessibilityLabel="Task notes"
              />
              <Text style={[styles.fieldLabel, { color: colors.text, fontSize: type.body }]}>Due date (optional)</Text>
              <View style={styles.chips}>
                {[
                  { label: 'Today', value: todayKey() },
                  { label: 'Tomorrow', value: offsetKey(1) },
                  { label: 'Next week', value: offsetKey(7) },
                ].map((d) => (
                  <Pressable
                    key={d.label}
                    onPress={() => taskDialog && setTaskDialog({ ...taskDialog, dueDate: d.value })}
                    style={[styles.chip, { borderColor: taskDialog?.dueDate === d.value ? colors.accent : colors.border, borderRadius: radius.md }]}
                    accessibilityLabel={`Due ${d.label}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipText, { color: taskDialog?.dueDate === d.value ? colors.accent : colors.text }]}>{d.label}</Text>
                  </Pressable>
                ))}
                {(taskDialog?.dueDate ?? '') !== '' && (
                  <Pressable
                    onPress={() => taskDialog && setTaskDialog({ ...taskDialog, dueDate: '' })}
                    style={[styles.chip, { borderColor: colors.border, borderRadius: radius.md }]}
                    accessibilityLabel="Clear due date"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipText, { color: colors.textMuted }]}>Clear</Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                value={taskDialog?.dueDate ?? ''}
                onChangeText={(v) => taskDialog && setTaskDialog({ ...taskDialog, dueDate: v })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                style={[styles.field, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, fontSize: type.body }]}
                accessibilityLabel="Due date"
              />
              <Text style={[styles.fieldLabel, { color: colors.text, fontSize: type.body }]}>Priority</Text>
              <View style={styles.chips}>
                {PRIORITIES.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => taskDialog && setTaskDialog({ ...taskDialog, priority: p })}
                    style={[styles.chip, { borderColor: taskDialog?.priority === p ? colors.accent : colors.border, borderRadius: radius.md }]}
                    accessibilityLabel={`${p} priority`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipText, { color: taskDialog?.priority === p ? colors.accent : colors.text }]}>
                      {p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Normal'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: colors.text, fontSize: type.body }]}>List</Text>
              <View style={styles.chips}>
                <Pressable
                  onPress={() => taskDialog && setTaskDialog({ ...taskDialog, listId: null })}
                  style={[styles.chip, { borderColor: !taskDialog?.listId ? colors.accent : colors.border, borderRadius: radius.md }]}
                  accessibilityLabel="No list"
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, { color: !taskDialog?.listId ? colors.accent : colors.text }]}>Unlisted</Text>
                </Pressable>
                {lists.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => taskDialog && setTaskDialog({ ...taskDialog, listId: l.id })}
                    style={[styles.chip, { borderColor: taskDialog?.listId === l.id ? colors.accent : colors.border, borderRadius: radius.md }]}
                    accessibilityLabel={`Put in ${l.name}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipText, { color: taskDialog?.listId === l.id ? colors.accent : colors.text }]}>{l.name}</Text>
                  </Pressable>
                ))}
              </View>
              {taskDialog?.error && (
                <Text style={[styles.error, { color: colors.danger, fontSize: type.body }]}>{taskDialog.error}</Text>
              )}
              <View style={styles.modalRow}>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => setTaskDialog(null)} style={[styles.mBtn, { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1 }]} accessibilityLabel="Cancel" accessibilityRole="button">
                  <Text style={{ color: colors.textMuted }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => void saveTask()} style={[styles.mBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]} accessibilityLabel="Save task" accessibilityRole="button">
                  <Text style={{ color: colors.onAccent, fontWeight: '700' }}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* List dialog */}
      <Modal visible={listDialog !== null} transparent animationType="fade" onRequestClose={() => setListDialog(null)}>
        <View style={[styles.modalWrap, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: type.heading }]}>
              {listDialog?.id ? 'Rename list' : 'New list'}
            </Text>
            <TextInput
              value={listDialog?.name ?? ''}
              onChangeText={(v) => listDialog && setListDialog({ ...listDialog, name: v })}
              placeholder="List name"
              placeholderTextColor={colors.textMuted}
              style={[styles.field, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, fontSize: type.body }]}
              accessibilityLabel="List name"
            />
            {!listDialog?.id && (
              <View style={styles.chips}>
                {LIST_SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => listDialog && setListDialog({ ...listDialog, name: s })}
                    style={[styles.chip, { borderColor: colors.border, borderRadius: radius.md }]}
                    accessibilityLabel={`Use ${s}`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipText, { color: colors.textMuted }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {listDialog?.error && (
              <Text style={[styles.error, { color: colors.danger, fontSize: type.body }]}>{listDialog.error}</Text>
            )}
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setListDialog(null)} style={[styles.mBtn, { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1 }]} accessibilityLabel="Cancel" accessibilityRole="button">
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void saveList()} style={[styles.mBtn, { backgroundColor: colors.accent, borderRadius: radius.md }]} accessibilityLabel="Save list" accessibilityRole="button">
                <Text style={{ color: colors.onAccent, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 8 },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchBar: { borderWidth: 1, paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center' },
  search: { fontSize: 15, flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  sortChip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, minHeight: 38, justifyContent: 'center' },
  sortText: { fontSize: 12, fontWeight: '600' },
  emptyWrap: { minHeight: 240 },
  card: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, marginTop: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10, minHeight: 60 },
  lastRow: { borderBottomWidth: 0 },
  check: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 3, flexWrap: 'wrap' },
  meta: {},
  miniBtn: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 52 },
  listName: { fontWeight: '600', flex: 1 },
  field: { borderWidth: 1, paddingHorizontal: 12, height: 48, marginTop: 10 },
  notesField: { height: 76, paddingTop: 12, textAlignVertical: 'top' },
  fieldLabel: { fontWeight: '700', marginTop: 12 },
  error: { marginTop: 10, lineHeight: 19 },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { width: '100%', maxWidth: 420, maxHeight: '90%', padding: 20 },
  modalTitle: { fontWeight: '700', marginBottom: 4 },
  modalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  mBtn: { paddingHorizontal: 18, paddingVertical: 11, minHeight: 44, justifyContent: 'center', marginLeft: 10 },
});
