import { useEffect, useState, useRef } from 'react';
import { useThrottle } from './use-throttle';

/**
 * 스크롤 방향을 감지하는 훅
 * @param threshold 스크롤 방향 변경 임계값 (기본값: 50)
 * @param throttleDelay 스크롤 방향 변경 쓰로틀 딜레이 (기본값: 200)
 * @returns 스크롤 방향 정보 객체
 *   - scrollDirection: 현재 스크롤 방향 ('up' | 'down' | null)
 *   - isScrollingUp: 위로 스크롤 중인지 여부
 *   - isScrollingDown: 아래로 스크롤 중인지 여부
 */
export function useScrollDirection(threshold: number = 50, throttleDelay: number = 200) {
  const prevScrollRef = useRef(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  const handleScroll = useThrottle(() => {
    const currentScroll = window.scrollY;
    const diff = currentScroll - prevScrollRef.current;

    if (Math.abs(diff) < threshold) {
      return;
    }

    const newDirection = diff > 0 ? 'down' : 'up';

    setScrollDirection(newDirection);

    prevScrollRef.current = currentScroll;
  }, throttleDelay);

  useEffect(() => {
    prevScrollRef.current = window.scrollY;

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return {
    scrollDirection,
    isScrollingUp: scrollDirection === 'up',
    isScrollingDown: scrollDirection === 'down',
  };
}

/**
 * 스크롤의 특정 위치에 도달했는지 확인하는 훅
 * @param position 스크롤 위치 (기본값: 100)
 * @param throttleDelay 스크롤 위치 쓰로틀 딜레이 (기본값: 200)
 * @returns 스크롤 위치 정보 객체
 *   - isOverScrollPosition: 지정된 위치를 넘었는지 여부
 *   - isUnderScrollPosition: 지정된 위치 아래에 있는지 여부
 */
export function useScrollPosition(position: number = 100, throttleDelay: number = 200) {
  const [isOverScrollPosition, setIsOverScrollPosition] = useState(false);

  const handleScroll = useThrottle(() => {
    const isOver = window.scrollY >= position;
    setIsOverScrollPosition(isOver);
  }, throttleDelay);

  useEffect(() => {
    const initialCheck = () => {
      const isOver = window.scrollY >= position;
      setIsOverScrollPosition(isOver);
    };

    initialCheck();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return {
    isOverScrollPosition,
    isUnderScrollPosition: !isOverScrollPosition,
  };
}
