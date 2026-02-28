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
