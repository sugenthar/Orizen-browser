import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterTasks,
  isValidDueDate,
  normalizeDueDate,
  offsetKey,
  sortTasks,
  taskCounts,
  todayKey,
  validateListName,
  validateTaskInput,
} from '../src/work/tasks.js';
import type { TaskList, TaskRecord } from '../src/types/index.js';

function task(overrides: Partial<TaskRecord> & { id: string }): TaskRecord {
  return {
    title: 'T',
    notes: '',
    dueDate: null,
    priority: 'normal',
    listId: null,
    completed: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

const NOW = new Date(2026, 9, 9, 12, 0, 0); // 2026-10-09

describe('task input validation', () => {
  it('requires a title', () => {
    assert.deepEqual(validateTaskInput({ title: '  ', dueDate: '' }), { error: 'Give the task a title.' });
    assert.deepEqual(validateTaskInput({ title: '  Buy milk  ', dueDate: '' }), { title: 'Buy milk' });
  });

  it('rejects impossible dates', () => {
    assert.equal(isValidDueDate('2026-10-15'), true);
    assert.equal(isValidDueDate('2026-02-30'), false);
    assert.equal(isValidDueDate('15-10-2026'), false);
    assert.equal(isValidDueDate(''), false);
    assert.equal(normalizeDueDate(''), null);
    assert.equal(normalizeDueDate('2026-10-15'), '2026-10-15');
    assert.deepEqual(validateTaskInput({ title: 'T', dueDate: 'nope' }), {
      error: 'Use a real date like 2026-10-15, or leave it empty.',
    });
  });

  it('validates list names and rejects duplicates', () => {
    const lists: TaskList[] = [{ id: 'a', name: 'Study', createdAt: 1 }];
    assert.deepEqual(validateListName('  ', lists), { error: 'Give the list a name.' });
    assert.deepEqual(validateListName('study', lists), { error: 'A list with that name already exists.' });
    assert.deepEqual(validateListName('Study', lists, 'a'), { name: 'Study' });
    assert.deepEqual(validateListName('Work', lists), { name: 'Work' });
  });
});

describe('task filtering and search', () => {
  const tasks = [
    task({ id: '1', title: 'Buy milk', dueDate: '2026-10-09' }),
    task({ id: '2', title: 'Read book', dueDate: '2026-10-20' }),
    task({ id: '3', title: 'Old task', completed: true }),
    task({ id: '4', title: 'No date' }),
  ];

  it('today shows only active tasks due today', () => {
    assert.deepEqual(filterTasks(tasks, 'today', '', NOW).map((t) => t.id), ['1']);
  });

  it('upcoming shows strictly future due dates', () => {
    assert.deepEqual(filterTasks(tasks, 'upcoming', '', NOW).map((t) => t.id), ['2']);
  });

  it('all hides completed, completed shows only completed', () => {
    assert.deepEqual(filterTasks(tasks, 'all', '', NOW).map((t) => t.id).sort(), ['1', '2', '4']);
    assert.deepEqual(filterTasks(tasks, 'completed', '', NOW).map((t) => t.id), ['3']);
  });

  it('search matches title and notes case-insensitively', () => {
    assert.deepEqual(filterTasks(tasks, 'all', 'MILK', NOW).map((t) => t.id), ['1']);
  });
});

describe('task sorting and counts', () => {
  const tasks = [
    task({ id: '1', title: 'B', priority: 'low', createdAt: 3000, dueDate: '2026-10-20' }),
    task({ id: '2', title: 'A', priority: 'high', createdAt: 1000, dueDate: '2026-10-09' }),
    task({ id: '3', title: 'C', priority: 'normal', createdAt: 2000, dueDate: null }),
  ];

  it('sorts by due date, priority, and creation', () => {
    assert.deepEqual(sortTasks(tasks, 'due').map((t) => t.id), ['2', '1', '3']);
    assert.deepEqual(sortTasks(tasks, 'priority').map((t) => t.id), ['2', '3', '1']);
    assert.deepEqual(sortTasks(tasks, 'created').map((t) => t.id), ['1', '3', '2']);
  });

  it('counts today/upcoming/all/completed', () => {
    const withDone = [...tasks, task({ id: '4', completed: true })];
    assert.deepEqual(taskCounts(withDone, NOW), { today: 1, upcoming: 1, all: 3, completed: 1 });
  });
});

describe('date helpers', () => {
  it('builds local calendar keys and offsets', () => {
    assert.equal(todayKey(NOW), '2026-10-09');
    assert.equal(offsetKey(1, NOW), '2026-10-10');
    assert.equal(offsetKey(7, NOW), '2026-10-16');
  });
});
