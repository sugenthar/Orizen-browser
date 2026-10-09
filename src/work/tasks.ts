import type { TaskList, TaskPriority, TaskRecord } from '../types';

/**
 * Pure task operations (no storage — unit-tested). The SQLite layer in
 * database.ts only persists validated records.
 */

export type TaskFilter = 'today' | 'upcoming' | 'all' | 'completed';
export type TaskSort = 'due' | 'priority' | 'created';

export const LIST_SUGGESTIONS = ['Study', 'Personal', 'Shopping', 'Projects', 'Reminders'] as const;

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD `days` after today (negative allowed). Timezone-safe. */
export function offsetKey(days: number, now: Date = new Date()): string {
  const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return todayKey(dt);
}

/** Strict YYYY-MM-DD calendar validation (rejects 2026-02-30 etc.). */
export function isValidDueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function normalizeDueDate(value: string): string | null {
  const t = value.trim();
  if (!t) return null;
  return isValidDueDate(t) ? t : null;
}

export function validateTaskInput(input: { title: string; dueDate: string }): { title: string } | { error: string } {
  const title = input.title.trim().slice(0, 200);
  if (!title) return { error: 'Give the task a title.' };
  const due = input.dueDate.trim();
  if (due && !isValidDueDate(due)) return { error: 'Use a real date like 2026-10-15, or leave it empty.' };
  return { title };
}

export function validateListName(name: string, existing: TaskList[], exceptId?: string): { name: string } | { error: string } {
  const clean = name.trim().slice(0, 60);
  if (!clean) return { error: 'Give the list a name.' };
  const clash = existing.some((l) => l.id !== exceptId && l.name.toLowerCase() === clean.toLowerCase());
  if (clash) return { error: 'A list with that name already exists.' };
  return { name: clean };
}

export function filterTasks(tasks: TaskRecord[], filter: TaskFilter, query: string, now: Date = new Date()): TaskRecord[] {
  const q = query.trim().toLowerCase();
  const today = todayKey(now);
  return tasks.filter((t) => {
    if (filter === 'completed' ? !t.completed : t.completed) return false;
    if (filter === 'today' && t.dueDate !== today) return false;
    if (filter === 'upcoming' && (!t.dueDate || t.dueDate <= today)) return false;
    if (q && !`${t.title}\n${t.notes}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortTasks(tasks: TaskRecord[], sort: TaskSort): TaskRecord[] {
  const arr = [...tasks];
  switch (sort) {
    case 'due':
      return arr.sort((a, b) => (a.dueDate ?? '9999') < (b.dueDate ?? '9999') ? -1 : 1);
    case 'priority':
      return arr.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt - a.createdAt);
    default:
      return arr.sort((a, b) => b.createdAt - a.createdAt);
  }
}

export function taskCounts(tasks: TaskRecord[], now: Date = new Date()): { today: number; upcoming: number; all: number; completed: number } {
  const today = todayKey(now);
  let todayN = 0;
  let upcomingN = 0;
  let allN = 0;
  let completedN = 0;
  for (const t of tasks) {
    if (t.completed) {
      completedN += 1;
      continue;
    }
    allN += 1;
    if (t.dueDate === today) todayN += 1;
    else if (t.dueDate && t.dueDate > today) upcomingN += 1;
  }
  return { today: todayN, upcoming: upcomingN, all: allN, completed: completedN };
}

export function listName(lists: TaskList[], listId: string | null): string {
  if (!listId) return 'Unlisted';
  return lists.find((l) => l.id === listId)?.name ?? 'Unlisted';
}
