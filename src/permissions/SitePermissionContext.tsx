import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeOrigin } from './sitePermissions';
import { clearSitePermissions, deleteSitePermission, listSitePermissions, setSitePermission } from '../storage/database';
import type { SitePermissionRecord } from '../types';

interface SitePermissionValue {
  /** Origins with an explicit tracker-protection exception (allow-list). */
  trackerExceptions: SitePermissionRecord[];
  refresh: () => void;
  /** Allow trackers on the page's origin (explicit user action). Returns false when the URL has no storable origin. */
  allowTrackersFor: (url: string) => Promise<boolean>;
  revokeSite: (origin: string, permission: string) => void;
  clearAll: () => void;
}

const SitePermissionContext = createContext<SitePermissionValue | null>(null);

export function SitePermissionProvider({ children }: { children: React.ReactNode }) {
  const [exceptions, setExceptions] = useState<SitePermissionRecord[]>([]);

  const refresh = useCallback(() => {
    void listSitePermissions()
      .then((rows) => setExceptions(rows.filter((r) => r.permission === 'tracker' && r.decision === 'allow')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allowTrackersFor = useCallback(
    async (url: string) => {
      const origin = normalizeOrigin(url);
      if (!origin) return false;
      try {
        await setSitePermission(origin, 'tracker', 'allow');
        refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh],
  );

  const revokeSite = useCallback(
    (origin: string, permission: string) => {
      void deleteSitePermission(origin, permission).then(() => refresh());
    },
    [refresh],
  );

  const clearAll = useCallback(() => {
    void clearSitePermissions().then(() => refresh());
  }, [refresh]);

  const value = useMemo<SitePermissionValue>(
    () => ({ trackerExceptions: exceptions, refresh, allowTrackersFor, revokeSite, clearAll }),
    [exceptions, refresh, allowTrackersFor, revokeSite, clearAll],
  );
  return <SitePermissionContext.Provider value={value}>{children}</SitePermissionContext.Provider>;
}

export function useSitePermissions(): SitePermissionValue {
  const ctx = useContext(SitePermissionContext);
  if (!ctx) throw new Error('useSitePermissions must be used within SitePermissionProvider');
  return ctx;
}
