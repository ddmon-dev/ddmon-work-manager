import { useState, useRef, useEffect } from 'react';
import { APP_CONFIG } from '@/app.config';

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 비동기 작업에 최소 실행 시간을 보장합니다.
 *
 * @param fn - 실행할 비동기 함수
 * @param minDuration - 최소 실행 시간 (ms)
 * @returns 함수 실행 결과
 *
 * @example
 * // 삭제 작업에 최소 300ms 로딩 보장
 * await atLeast(() => deleteItem(id), 300);
 *
 * @example
 * // 데이터 페칭에 최소 시간 적용
 * const data = await atLeast(() => fetchData(), 500);
 */
export async function atLeast<T>(
  fn: () => Promise<T>,
  minDuration: number = APP_CONFIG.UX.MIN_LOADING_TIME
): Promise<T> {
  const [result] = await Promise.allSettled([fn(), delay(minDuration)]);

  if (result.status === 'rejected') {
    throw result.reason;
  }
  return result.value;
}

/**
 * isLoading 상태가 최소 minMs 동안 유지되도록 보장합니다.
 * 빠른 로딩 시 스켈레톤 깜빡임(flash)을 방지합니다.
 */
export function useAtLeastLoading(
  isLoading: boolean,
  minMs: number = APP_CONFIG.UX.MIN_LOADING_TIME
): boolean {
  const [visible, setVisible] = useState(isLoading);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setVisible(true);
    } else if (startTimeRef.current !== null) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minMs - elapsed);
      if (remaining > 0) {
        const timer = setTimeout(() => setVisible(false), remaining);
        return () => clearTimeout(timer);
      } else {
        setVisible(false);
      }
    }
  }, [isLoading, minMs]);

  return visible;
}
