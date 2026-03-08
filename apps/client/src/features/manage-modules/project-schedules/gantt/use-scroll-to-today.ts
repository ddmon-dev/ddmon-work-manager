import { useRef, useEffect } from "react";
import { dateToX, startOfDay } from "./utils";

export function useScrollToToday(scrollRef: React.RefObject<HTMLDivElement | null>, rangeStart: Date) {
  const didScroll = useRef(false);

  useEffect(() => {
    if (didScroll.current || !scrollRef.current) return;
    didScroll.current = true;
    const todayX = dateToX(startOfDay(new Date()), rangeStart);
    const containerWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 3);
  }, [rangeStart, scrollRef]);
}
