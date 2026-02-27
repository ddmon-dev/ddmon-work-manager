import { useSearchParams, useNavigate, useLocation } from "react-router";

interface UseQueryParamsReturn {
  searchParams: URLSearchParams;
  get(key: string): string | null;
  getValues(): Record<string, string>;
  getValues(...keys: string[]): Record<string, string | null>;
  set(key: string, value: string): void;
  set(params: Record<string, string>): void;
  remove(keys: string | string[]): void;
  clear(): void;
  has(key: string): boolean;
}

export function useQueryParams(): UseQueryParamsReturn {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const current = () => new URLSearchParams(searchParams);

  const push = (params: URLSearchParams) => {
    navigate(`${location.pathname}?${params.toString()}`, { replace: false });
  };

  function get(key: string): string | null {
    return current().get(key);
  }

  function getValues(): Record<string, string>;
  function getValues(...keys: string[]): Record<string, string | null>;
  function getValues(...keys: string[]): Record<string, string | null> {
    const params = current();
    if (keys.length === 0) {
      const result: Record<string, string> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    const result: Record<string, string | null> = {};
    keys.forEach((key) => {
      result[key] = params.get(key);
    });
    return result;
  }

  function set(key: string, value: string): void;
  function set(params: Record<string, string>): void;
  function set(
    ...args: [string, string] | [Record<string, string>]
  ): void {
    const params = current();
    if (typeof args[0] === "string") {
      params.set(args[0], args[1] as string);
    } else {
      Object.entries(args[0]).forEach(([k, v]) => params.set(k, v));
    }
    push(params);
  }

  function remove(keys: string | string[]): void {
    const params = current();
    if (typeof keys === "string") {
      params.delete(keys);
    } else {
      keys.forEach((key) => params.delete(key));
    }
    push(params);
  }

  function clear(): void {
    push(new URLSearchParams());
  }

  function has(key: string): boolean {
    return current().has(key);
  }

  return { searchParams, get, getValues, set, remove, clear, has };
}
