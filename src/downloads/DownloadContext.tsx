import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearCompletedDownloads,
  deleteDownloadRecord,
  insertDownload,
  listDownloads,
  updateDownload,
} from '../storage/database';
import type { DownloadRecord, DownloadStatus } from '../types';
import { newId } from '../utils/helpers';
import {
  DOWNLOAD_DIR_NAME,
  ensureExtension,
  filenameFromContentDisposition,
  filenameFromUrl,
  isDownloadableUrl,
  mimeFromFilename,
} from './downloadManager';

interface DownloadsValue {
  records: DownloadRecord[];
  /** In-memory progress (0..1) for active downloads. Never persisted. */
  progress: Record<string, number>;
  /** In-memory byte detail for active downloads. Never persisted. */
  progressDetail: Record<string, { written: number; expected: number }>;
  notice: string | null;
  refresh: () => void;
  startDownload: (url: string, fromPrivate: boolean) => void;
  cancelDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  openDownload: (id: string) => void;
  clearFinished: () => void;
  /** Retry a failed/cancelled download while its source is still in memory (session-only; never persisted). */
  retryDownload: (id: string) => void;
  canRetry: (id: string) => boolean;
}

const DownloadsContext = createContext<DownloadsValue | null>(null);

async function headProbe(url: string): Promise<{ filename: string | null; mime: string | null; size: number }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    const size = Number(res.headers.get('content-length') ?? 0);
    return {
      filename: filenameFromContentDisposition(res.headers.get('content-disposition')),
      mime: res.headers.get('content-type'),
      size: Number.isFinite(size) && size > 0 ? size : 0,
    };
  } catch {
    return { filename: null, mime: null, size: 0 };
  }
}

export function DownloadsProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [progressDetail, setProgressDetail] = useState<Record<string, { written: number; expected: number }>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const resumables = useRef(new Map<string, FileSystem.DownloadResumable>());
  /** Session-only source URLs for retry. Memory only — never written to storage, lost on restart. */
  const sources = useRef(new Map<string, { url: string; fromPrivate: boolean }>());
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProgressState = useCallback((id: string) => {
    setProgress((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
    setProgressDetail((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  }, []);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  const refresh = useCallback(() => {
    void listDownloads().then(setRecords).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [refresh]);

  const failRecord = useCallback(
    async (id: string, message: string) => {
      resumables.current.delete(id);
      clearProgressState(id);
      await updateDownload(id, { status: 'failed', completedAt: Date.now() });
      refresh();
      showNotice(message);
    },
    [refresh, showNotice, clearProgressState],
  );

  const startDownload = useCallback(
    (url: string, fromPrivate: boolean) => {
      void (async () => {
        if (!isDownloadableUrl(url)) {
          showNotice('This file type cannot be downloaded in Orizen.');
          return;
        }
        const dir = (FileSystem.documentDirectory ?? '') + DOWNLOAD_DIR_NAME;
        try {
          const info = await FileSystem.getInfoAsync(dir);
          if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        } catch {
          showNotice('Storage unavailable. The download could not start.');
          return;
        }
        // Best-effort metadata probe (no cookies/credentials are sent).
        const probe = await headProbe(url);
        const base = probe.filename ?? filenameFromUrl(url);
        const filename = ensureExtension(base, probe.mime);
        const id = newId('dl');
        const fileUri = `${dir}/${id}-${filename}`;
        const record: DownloadRecord = {
          id,
          filename,
          fileUri,
          mimeType: probe.mime ? probe.mime.split(';')[0]!.trim() : mimeFromFilename(filename),
          size: probe.size,
          status: 'downloading',
          fromPrivate,
          createdAt: Date.now(),
          completedAt: null,
        };
        try {
          await insertDownload(record);
        } catch {
          showNotice('The download could not be recorded.');
          return;
        }
        refresh();
        let lastEmit = 0;
        const resumable = FileSystem.createDownloadResumable(url, fileUri, {}, (data) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } = data;
          if (totalBytesExpectedToWrite > 0) {
            const ratio = totalBytesWritten / totalBytesExpectedToWrite;
            const now = Date.now();
            if (ratio >= 1 || now - lastEmit > 400) {
              lastEmit = now;
              setProgress((p) => ({ ...p, [id]: Math.min(1, ratio) }));
              setProgressDetail((p) => ({ ...p, [id]: { written: totalBytesWritten, expected: totalBytesExpectedToWrite } }));
            }
          }
        });
        resumables.current.set(id, resumable);
        sources.current.set(id, { url, fromPrivate });
        try {
          const result = await resumable.downloadAsync();
          resumables.current.delete(id);
          clearProgressState(id);
          if (!result || result.status !== 200) {
            await updateDownload(id, { status: 'failed', completedAt: Date.now() });
            refresh();
            showNotice('Download failed. Please try again.');
            return;
          }
          const contentLength = Number(result.headers['content-length'] ?? result.headers['Content-Length'] ?? 0);
          const contentType = result.headers['content-type'] ?? result.headers['Content-Type'] ?? null;
          const status: DownloadStatus = 'completed';
          await updateDownload(id, {
            status,
            size: Number.isFinite(contentLength) && contentLength > 0 ? contentLength : probe.size,
            mimeType: typeof contentType === 'string' ? contentType.split(';')[0]!.trim() : record.mimeType,
            completedAt: Date.now(),
          });
          refresh();
          showNotice('Download complete');
        } catch {
          await failRecord(id, 'Download failed. Please try again.');
        }
      })();
    },
    [failRecord, refresh, showNotice],
  );

  const cancelDownload = useCallback(
    (id: string) => {
      void (async () => {
        const resumable = resumables.current.get(id);
        try {
          await resumable?.pauseAsync();
        } catch {
          // continue with cleanup regardless
        }
        resumables.current.delete(id);
        const rec = records.find((r) => r.id === id);
        if (rec) {
          try {
            await FileSystem.deleteAsync(rec.fileUri, { idempotent: true });
          } catch {
            // file may not exist yet
          }
        }
        clearProgressState(id);
        await updateDownload(id, { status: 'cancelled', completedAt: Date.now() });
        refresh();
      })();
    },
    [records, refresh, clearProgressState],
  );

  const removeDownload = useCallback(
    (id: string) => {
      void (async () => {
        const resumable = resumables.current.get(id);
        try {
          await resumable?.pauseAsync();
        } catch {
          // ignore
        }
        resumables.current.delete(id);
        sources.current.delete(id);
        const rec = records.find((r) => r.id === id);
        if (rec) {
          try {
            await FileSystem.deleteAsync(rec.fileUri, { idempotent: true });
          } catch {
            // file may already be gone
          }
        }
        clearProgressState(id);
        await deleteDownloadRecord(id);
        refresh();
      })();
    },
    [records, refresh, clearProgressState],
  );

  const openDownload = useCallback(
    (id: string) => {
      void (async () => {
        const rec = records.find((r) => r.id === id);
        if (!rec) return;
        try {
          const available = await Sharing.isAvailableAsync();
          if (!available) {
            showNotice('No app available to open this file.');
            return;
          }
          await Sharing.shareAsync(rec.fileUri, { mimeType: rec.mimeType ?? undefined, dialogTitle: rec.filename });
        } catch {
          showNotice('The file could not be opened.');
        }
      })();
    },
    [records, showNotice],
  );

  const clearFinished = useCallback(() => {
    void (async () => {
      const finished = records.filter((r) => r.status !== 'downloading' && r.status !== 'pending' && !resumables.current.has(r.id));
      for (const rec of finished) {
        try {
          await FileSystem.deleteAsync(rec.fileUri, { idempotent: true });
        } catch {
          // ignore missing files
        }
      }
      await clearCompletedDownloads();
      refresh();
    })();
  }, [records, refresh]);

  const canRetry = useCallback(
    (id: string) => {
      const rec = records.find((r) => r.id === id);
      if (!rec || rec.status === 'downloading' || rec.status === 'pending') return false;
      if (resumables.current.has(id)) return false;
      return sources.current.has(id);
    },
    [records],
  );

  const retryDownload = useCallback(
    (id: string) => {
      const rec = records.find((r) => r.id === id);
      const source = sources.current.get(id);
      if (!rec || !source || rec.status === 'downloading' || rec.status === 'pending') return;
      // Fresh record, same source: removes the failed entry/file, then starts
      // over. The source URL lives in memory only and is dropped with remove.
      sources.current.delete(id);
      removeDownload(id);
      startDownload(source.url, rec.fromPrivate);
    },
    [records, removeDownload, startDownload],
  );

  const value = useMemo<DownloadsValue>(
    () => ({ records, progress, progressDetail, notice, refresh, startDownload, cancelDownload, removeDownload, openDownload, clearFinished, retryDownload, canRetry }),
    [records, progress, progressDetail, notice, refresh, startDownload, cancelDownload, removeDownload, openDownload, clearFinished, retryDownload, canRetry],
  );
  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads(): DownloadsValue {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadsProvider');
  return ctx;
}
