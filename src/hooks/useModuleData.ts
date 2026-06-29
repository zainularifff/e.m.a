import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearModuleCache,
  loadModuleData,
  type ModuleDataResult,
} from "../services/moduleDataService";
import type { ModuleKey } from "../services/moduleApiRegistry";

type UseModuleDataOptions = {
  enabled?: boolean;
  params?: Record<string, unknown>;
  forceOnMount?: boolean;
};

export function useModuleData<T = Record<string, unknown>>(
  moduleKey: ModuleKey,
  options: UseModuleDataOptions = {}
) {
  const { enabled = true, params = {}, forceOnMount = false } = options;

  const [data, setData] = useState<ModuleDataResult<T> | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const reload = useCallback(
    async (force = false) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setError("");

        if (force) {
          clearModuleCache(moduleKey);
        }

        const result = await loadModuleData<T>(moduleKey, {
          params,
          force,
          signal: controller.signal,
        });

        setData(result);
        return result;
      } catch (err) {
        if (err instanceof Error && err.name === "CanceledError") {
          return null;
        }

        const message = err instanceof Error ? err.message : "Failed to load module data.";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [moduleKey, paramsKey]
  );

  useEffect(() => {
    if (!enabled) return;

    reload(forceOnMount);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [enabled, forceOnMount, reload]);

  return {
    data,
    loading,
    error,
    reload,
    clearCache: () => clearModuleCache(moduleKey),
  };
}
