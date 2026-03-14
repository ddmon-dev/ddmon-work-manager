import { useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";

interface UseQueryParamsReturn {
  searchParams: URLSearchParams;
  get: (key: string) => string | null;
  getValues: (...keys: string[]) => Record<string, string | null>;
  set: (params: Record<string, string>) => void;
  remove: (keys: string | string[]) => void;
  clear: () => void;
  has: (key: string) => boolean;
}

export function useQueryParams(): UseQueryParamsReturn {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const push = useCallback(
    (params: URLSearchParams) => {
      navigate(`${location.pathname}?${params.toString()}`, { replace: false });
    },
    [navigate, location.pathname],
  );

  const get = useCallback(
    (key: string): string | null => {
      return searchParams.get(key);
    },
    [searchParams],
  );

  const getValues = useCallback(
    (...keys: string[]): Record<string, string | null> => {
      if (keys.length === 0) {
        const result: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      }
      const result: Record<string, string | null> = {};
      keys.forEach((key) => {
        result[key] = searchParams.get(key);
      });
      return result;
    },
    [searchParams],
  );

  const set = useCallback(
    (params: Record<string, string>): void => {
      const next = new URLSearchParams(searchParams);
      Object.entries(params).forEach(([k, v]) => next.set(k, v));
      push(next);
    },
    [searchParams, push],
  );

  const remove = useCallback(
    (keys: string | string[]): void => {
      const next = new URLSearchParams(searchParams);
      const keyList = typeof keys === "string" ? [keys] : keys;
      keyList.forEach((key) => next.delete(key));
      push(next);
    },
    [searchParams, push],
  );

  const clear = useCallback((): void => {
    push(new URLSearchParams());
  }, [push]);

  const has = useCallback(
    (key: string): boolean => {
      return searchParams.has(key);
    },
    [searchParams],
  );

  return { searchParams, get, getValues, set, remove, clear, has };
}
