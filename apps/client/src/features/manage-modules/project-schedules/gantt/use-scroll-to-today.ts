import { useRef, useEffect } from "react";
import { dateToX, startOfDay } from "./utils";

export function useScrollToToday(scrollRef: React.RefObject<HTMLDivElement | null>, rangeStart: Date, enabled = true) {
  const didScroll = useRef(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!enabled || didScroll.current || !container) return;
    didScroll.current = true;
    const todayX = dateToX(startOfDay(new Date()), rangeStart);
    container.scrollLeft = Math.max(0, todayX - container.clientWidth / 3);
  }, [rangeStart, scrollRef, enabled]);
}
