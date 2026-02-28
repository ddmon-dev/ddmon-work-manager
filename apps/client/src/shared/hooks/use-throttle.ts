import { useRef, useCallback, useEffect } from 'react';

/**
 * 함수 호출을 쓰로틀링하는 훅
 * @param callback 쓰로틀링할 콜백 함수
 * @param delay 쓰로틀 딜레이 (밀리초)
 * @returns 쓰로틀된 콜백 함수
 */
export function useThrottle<Args extends unknown[]>(callback: (...args: Args) => void, delay: number): (...args: Args) => void {
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  const lastRunRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  // 최신 callback을 항상 참조하도록 함
  callbackRef.current = callback;

  // 타이머 클린업
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
    };
  }, []);

  const throttledCallback = useCallback(
    (...args: Args) => {
      const now = Date.now();

      if (now - lastRunRef.current >= delay) {
        callbackRef.current(...args);
        lastRunRef.current = now;
      } else if (!throttleRef.current) {
        const remainingTime = delay - (now - lastRunRef.current);
        throttleRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastRunRef.current = Date.now();
          throttleRef.current = null;
        }, remainingTime);
      }
    },
    [delay]
  );

  return throttledCallback;
}
