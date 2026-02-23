// ============================================================
// useModuleTutorials — hook for managing module tutorial state
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import {
  fetchViewedModuleTutorials,
  markModuleTutorialViewed,
} from '@/lib/onboarding';

export function useModuleTutorials() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [viewedModules, setViewedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setViewedModules(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const modules = await fetchViewedModuleTutorials(companyId);
        if (!cancelled) {
          setViewedModules(new Set(modules));
        }
      } catch (e) {
        console.error('[useModuleTutorials] Load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [companyId]);

  const markViewed = useCallback(
    async (moduleName: string) => {
      if (!companyId) return;
      setViewedModules((prev) => new Set([...prev, moduleName]));
      try {
        await markModuleTutorialViewed(companyId, moduleName);
      } catch (e) {
        console.error('[useModuleTutorials] Mark error:', e);
      }
    },
    [companyId],
  );

  const isViewed = useCallback(
    (moduleName: string) => viewedModules.has(moduleName),
    [viewedModules],
  );

  return {
    viewedModules,
    loading,
    markViewed,
    isViewed,
  };
}
