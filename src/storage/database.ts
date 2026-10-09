import * as SQLite from 'expo-sqlite';
import { isSearchResultsUrl } from '../search/searchService';
import type { Bookmark, DownloadRecord, HistoryItem, QuickLink, SitePermissionRecord, TaskList, TaskRecord } from '../types';
import type { ConversionRecord } from '../converter/types';
import { newId } from '../utils/helpers';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) db = SQLite.openDatabaseSync('orizen.db');
  return db;
}

export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const database = getDb();
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          folder TEXT NOT NULL DEFAULT 'default'
        );
        CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
        CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          visitedAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_history_visited ON history(visitedAt DESC);
        CREATE TABLE IF NOT EXISTS quick_links (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS downloads (
          id TEXT PRIMARY KEY NOT NULL,
          filename TEXT NOT NULL,
          fileUri TEXT NOT NULL,
          mimeType TEXT,
          size INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'downloading',
          fromPrivate INTEGER NOT NULL DEFAULT 0,
          createdAt INTEGER NOT NULL,
          completedAt INTEGER
        );
        CREATE TABLE IF NOT EXISTS site_permissions (
          origin TEXT NOT NULL,
          permission TEXT NOT NULL,
          decision TEXT NOT NULL,
          updatedAt INTEGER NOT NULL,
          PRIMARY KEY (origin, permission)
        );
        CREATE TABLE IF NOT EXISTS conversions (
          id TEXT PRIMARY KEY NOT NULL,
          toolId TEXT NOT NULL,
          toolTitle TEXT NOT NULL,
          inputName TEXT NOT NULL,
          outputName TEXT NOT NULL,
          outputUri TEXT NOT NULL,
          mimeType TEXT,
          size INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'completed',
          error TEXT,
          createdAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS task_lists (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          dueDate TEXT,
          priority TEXT NOT NULL DEFAULT 'normal',
          listId TEXT,
          completed INTEGER NOT NULL DEFAULT 0,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(listId);
        CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
      `);
      await migrateToV2(database);
    })().catch(() => {
      console.warn('[Orizen] Database unavailable');
    });
  }
  return initPromise;
}

/**
 * v0.2 migration (idempotent): remove any search-results pages that v0.1
 * stored in history. Search queries must never be persisted.
 * Bookmarks, quick links and settings are untouched.
 */
async function migrateToV2(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const done = await database.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', ['search_purge_v2']);
    if (done) return;
    const rows = await database.getAllAsync<HistoryItem>('SELECT id, title, url, visitedAt FROM history');
    const searchIds = rows.filter((r) => isSearchResultsUrl(r.url)).map((r) => r.id);
    for (const id of searchIds) {
      await database.runAsync('DELETE FROM history WHERE id = ?', [id]);
    }
    await database.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['search_purge_v2', '1']);
    console.log('[Orizen] Database migration completed');
  } catch {
    // Migration must never crash the app, including on empty databases.
  }
}

// ---------- Bookmarks ----------

export async function getBookmarks(limit = 500): Promise<Bookmark[]> {
  try {
    await initDatabase();
    return await getDb().getAllAsync<Bookmark>(
      'SELECT id, title, url, createdAt, folder FROM bookmarks ORDER BY createdAt DESC LIMIT ?',
      [limit],
    );
  } catch (e) {
    console.warn('[Orizen] getBookmarks failed', e);
    return [];
  }
}

export async function searchBookmarks(query: string): Promise<Bookmark[]> {
  try {
    await initDatabase();
    const q = `%${query.trim()}%`;
    return await getDb().getAllAsync<Bookmark>(
      'SELECT id, title, url, createdAt, folder FROM bookmarks WHERE title LIKE ? OR url LIKE ? ORDER BY createdAt DESC LIMIT 200',
      [q, q],
    );
  } catch (e) {
    console.warn('[Orizen] searchBookmarks failed', e);
    return [];
  }
}

export async function isBookmarked(url: string): Promise<boolean> {
  try {
    await initDatabase();
    const row = await getDb().getFirstAsync<{ id: string }>('SELECT id FROM bookmarks WHERE url = ? LIMIT 1', [url]);
    return row != null;
  } catch {
    return false;
  }
}

export async function addBookmark(title: string, url: string, folder = 'default'): Promise<Bookmark> {
  await initDatabase();
  const item: Bookmark = { id: newId('bm'), title: title || url, url, createdAt: Date.now(), folder };
  await getDb().runAsync('INSERT OR REPLACE INTO bookmarks (id, title, url, createdAt, folder) VALUES (?, ?, ?, ?, ?)', [
    item.id,
    item.title,
    item.url,
    item.createdAt,
    item.folder,
  ]);
  return item;
}

export async function removeBookmarkByUrl(url: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM bookmarks WHERE url = ?', [url]);
  } catch (e) {
    console.warn('[Orizen] removeBookmark failed', e);
  }
}

export async function removeBookmark(id: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
  } catch (e) {
    console.warn('[Orizen] removeBookmark failed', e);
  }
}

export async function updateBookmark(id: string, patch: Partial<Pick<Bookmark, 'title' | 'url' | 'folder'>>): Promise<void> {
  try {
    await initDatabase();
    const current = await getDb().getFirstAsync<Bookmark>('SELECT * FROM bookmarks WHERE id = ? LIMIT 1', [id]);
    if (!current) return;
    const next = { ...current, ...patch };
    await getDb().runAsync('UPDATE bookmarks SET title = ?, url = ?, folder = ? WHERE id = ?', [
      next.title,
      next.url,
      next.folder,
      id,
    ]);
  } catch (e) {
    console.warn('[Orizen] updateBookmark failed', e);
  }
}

export async function clearBookmarks(): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM bookmarks');
  } catch (e) {
    console.warn('[Orizen] clearBookmarks failed', e);
  }
}

// ---------- History ----------

export async function addHistory(title: string, url: string): Promise<void> {
  try {
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) return;
    // Defense in depth: the storage layer itself refuses search-result pages,
    // so a caller can never persist a query even by accident.
    if (isSearchResultsUrl(clean)) return;
    await initDatabase();
    // Avoid spamming history with the same URL visited twice in 10s.
    const recent = await getDb().getFirstAsync<HistoryItem>(
      'SELECT id, visitedAt FROM history WHERE url = ? ORDER BY visitedAt DESC LIMIT 1',
      [clean],
    );
    if (recent && Date.now() - recent.visitedAt < 10_000) return;
    await getDb().runAsync('INSERT INTO history (id, title, url, visitedAt) VALUES (?, ?, ?, ?)', [
      newId('h'),
      title || clean,
      clean,
      Date.now(),
    ]);
  } catch (e) {
    console.warn('[Orizen] addHistory failed', e);
  }
}

export async function getHistory(limit = 100, offset = 0): Promise<HistoryItem[]> {
  try {
    await initDatabase();
    return await getDb().getAllAsync<HistoryItem>(
      'SELECT id, title, url, visitedAt FROM history ORDER BY visitedAt DESC LIMIT ? OFFSET ?',
      [limit, offset],
    );
  } catch (e) {
    console.warn('[Orizen] getHistory failed', e);
    return [];
  }
}

export async function searchHistory(query: string): Promise<HistoryItem[]> {
  try {
    await initDatabase();
    const q = `%${query.trim()}%`;
    return await getDb().getAllAsync<HistoryItem>(
      'SELECT id, title, url, visitedAt FROM history WHERE title LIKE ? OR url LIKE ? ORDER BY visitedAt DESC LIMIT 200',
      [q, q],
    );
  } catch (e) {
    console.warn('[Orizen] searchHistory failed', e);
    return [];
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM history WHERE id = ?', [id]);
  } catch (e) {
    console.warn('[Orizen] deleteHistoryItem failed', e);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM history');
  } catch (e) {
    console.warn('[Orizen] clearHistory failed', e);
  }
}

// ---------- Quick links ----------

export async function getQuickLinks(): Promise<QuickLink[]> {
  try {
    await initDatabase();
    return await getDb().getAllAsync<QuickLink>(
      'SELECT id, title, url, createdAt FROM quick_links ORDER BY createdAt ASC LIMIT 24',
    );
  } catch (e) {
    console.warn('[Orizen] getQuickLinks failed', e);
    return [];
  }
}

export async function addQuickLink(title: string, url: string): Promise<QuickLink> {
  await initDatabase();
  const item: QuickLink = { id: newId('ql'), title: title || url, url, createdAt: Date.now() };
  await getDb().runAsync('INSERT INTO quick_links (id, title, url, createdAt) VALUES (?, ?, ?, ?)', [
    item.id,
    item.title,
    item.url,
    item.createdAt,
  ]);
  return item;
}

export async function removeQuickLink(id: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM quick_links WHERE id = ?', [id]);
  } catch {
    console.warn('[Orizen] Quick link unavailable');
  }
}

export async function updateQuickLink(id: string, title: string, url: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('UPDATE quick_links SET title = ?, url = ? WHERE id = ?', [title, url, id]);
  } catch {
    console.warn('[Orizen] Quick link unavailable');
  }
}

// ---------- Downloads ----------

export async function insertDownload(record: DownloadRecord): Promise<void> {
  await initDatabase();
  await getDb().runAsync(
    'INSERT INTO downloads (id, filename, fileUri, mimeType, size, status, fromPrivate, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      record.id,
      record.filename,
      record.fileUri,
      record.mimeType,
      record.size,
      record.status,
      record.fromPrivate ? 1 : 0,
      record.createdAt,
      record.completedAt,
    ],
  );
}

export async function updateDownload(id: string, patch: Partial<Pick<DownloadRecord, 'status' | 'size' | 'mimeType' | 'fileUri' | 'filename' | 'completedAt'>>): Promise<void> {
  try {
    await initDatabase();
    const current = await getDb().getFirstAsync<DownloadRecord>('SELECT * FROM downloads WHERE id = ? LIMIT 1', [id]);
    if (!current) return;
    const next = { ...current, ...patch };
    await getDb().runAsync('UPDATE downloads SET filename = ?, fileUri = ?, mimeType = ?, size = ?, status = ?, completedAt = ? WHERE id = ?', [
      next.filename,
      next.fileUri,
      next.mimeType,
      next.size,
      next.status,
      next.completedAt,
      id,
    ]);
  } catch {
    console.warn('[Orizen] Download unavailable');
  }
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  try {
    await initDatabase();
    const rows = await getDb().getAllAsync<DownloadRecord>('SELECT * FROM downloads ORDER BY createdAt DESC LIMIT 200');
    return rows.map((r) => ({ ...r, fromPrivate: Boolean(r.fromPrivate) }));
  } catch {
    console.warn('[Orizen] Download unavailable');
    return [];
  }
}

export async function deleteDownloadRecord(id: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM downloads WHERE id = ?', [id]);
  } catch {
    console.warn('[Orizen] Download unavailable');
  }
}

export async function clearCompletedDownloads(): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync("DELETE FROM downloads WHERE status IN ('completed', 'cancelled', 'failed')");
  } catch {
    console.warn('[Orizen] Download unavailable');
  }
}

// ---------- Site permissions ----------
// Only enforceable per-site decisions are stored (see sitePermissions.ts).
// 'ask' is the default and is represented by the ABSENCE of a row.

export async function getSitePermission(origin: string, permission: string): Promise<SitePermissionRecord | null> {
  try {
    await initDatabase();
    return await getDb().getFirstAsync<SitePermissionRecord>(
      'SELECT origin, permission, decision, updatedAt FROM site_permissions WHERE origin = ? AND permission = ? LIMIT 1',
      [origin, permission],
    );
  } catch {
    return null;
  }
}

export async function listSitePermissions(): Promise<SitePermissionRecord[]> {
  try {
    await initDatabase();
    return await getDb().getAllAsync<SitePermissionRecord>(
      'SELECT origin, permission, decision, updatedAt FROM site_permissions ORDER BY updatedAt DESC LIMIT 200',
    );
  } catch {
    console.warn('[Orizen] Site permissions unavailable');
    return [];
  }
}

export async function setSitePermission(origin: string, permission: string, decision: 'allow' | 'block'): Promise<void> {
  await initDatabase();
  await getDb().runAsync(
    'INSERT OR REPLACE INTO site_permissions (origin, permission, decision, updatedAt) VALUES (?, ?, ?, ?)',
    [origin, permission, decision, Date.now()],
  );
}

export async function deleteSitePermission(origin: string, permission: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM site_permissions WHERE origin = ? AND permission = ?', [origin, permission]);
  } catch {
    console.warn('[Orizen] Site permissions unavailable');
  }
}

export async function clearSitePermissions(): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM site_permissions');
  } catch {
    console.warn('[Orizen] Site permissions unavailable');
  }
}

// ---------- Conversions (local records only: names, sizes, URIs) ----------

export async function insertConversion(record: ConversionRecord): Promise<void> {
  await initDatabase();
  await getDb().runAsync(
    'INSERT INTO conversions (id, toolId, toolTitle, inputName, outputName, outputUri, mimeType, size, status, error, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      record.id,
      record.toolId,
      record.toolTitle,
      record.inputName,
      record.outputName,
      record.outputUri,
      record.mimeType,
      record.size,
      record.status,
      record.error,
      record.createdAt,
    ],
  );
}

export async function listConversions(limit = 30): Promise<ConversionRecord[]> {
  try {
    await initDatabase();
    return await getDb().getAllAsync<ConversionRecord>(
      'SELECT * FROM conversions ORDER BY createdAt DESC LIMIT ?',
      [limit],
    );
  } catch {
    console.warn('[Orizen] Conversions unavailable');
    return [];
  }
}

export async function deleteConversion(id: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM conversions WHERE id = ?', [id]);
  } catch {
    console.warn('[Orizen] Conversions unavailable');
  }
}

// ---------- Tasks & lists (local-only personal data) ----------

export async function listTaskLists(): Promise<TaskList[]> {
  try {
    await initDatabase();
    return await getDb().getAllAsync<TaskList>('SELECT id, name, createdAt FROM task_lists ORDER BY createdAt ASC');
  } catch {
    console.warn('[Orizen] Task lists unavailable');
    return [];
  }
}

export async function insertTaskList(list: TaskList): Promise<void> {
  await initDatabase();
  await getDb().runAsync('INSERT INTO task_lists (id, name, createdAt) VALUES (?, ?, ?)', [list.id, list.name, list.createdAt]);
}

export async function renameTaskList(id: string, name: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('UPDATE task_lists SET name = ? WHERE id = ?', [name, id]);
  } catch {
    console.warn('[Orizen] Task lists unavailable');
  }
}

export async function deleteTaskList(id: string): Promise<void> {
  try {
    await initDatabase();
    // Tasks survive list deletion: they become unlisted instead of vanishing.
    await getDb().runAsync('UPDATE tasks SET listId = NULL, updatedAt = ? WHERE listId = ?', [Date.now(), id]);
    await getDb().runAsync('DELETE FROM task_lists WHERE id = ?', [id]);
  } catch {
    console.warn('[Orizen] Task lists unavailable');
  }
}

export async function listTasks(): Promise<TaskRecord[]> {
  try {
    await initDatabase();
    const rows = await getDb().getAllAsync<TaskRecord>(
      'SELECT id, title, notes, dueDate, priority, listId, completed, createdAt, updatedAt FROM tasks ORDER BY createdAt DESC LIMIT 1000',
    );
    return rows.map((r) => ({ ...r, completed: Boolean(r.completed) }));
  } catch {
    console.warn('[Orizen] Tasks unavailable');
    return [];
  }
}

export async function insertTask(task: TaskRecord): Promise<void> {
  await initDatabase();
  await getDb().runAsync(
    'INSERT INTO tasks (id, title, notes, dueDate, priority, listId, completed, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [task.id, task.title, task.notes, task.dueDate, task.priority, task.listId, task.completed ? 1 : 0, task.createdAt, task.updatedAt],
  );
}

export async function updateTask(task: TaskRecord): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync(
      'UPDATE tasks SET title = ?, notes = ?, dueDate = ?, priority = ?, listId = ?, completed = ?, updatedAt = ? WHERE id = ?',
      [task.title, task.notes, task.dueDate, task.priority, task.listId, task.completed ? 1 : 0, task.updatedAt, task.id],
    );
  } catch {
    console.warn('[Orizen] Tasks unavailable');
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await initDatabase();
    await getDb().runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  } catch {
    console.warn('[Orizen] Tasks unavailable');
  }
}
