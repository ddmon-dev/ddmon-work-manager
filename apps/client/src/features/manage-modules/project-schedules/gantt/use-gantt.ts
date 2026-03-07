import { useState, useCallback, useMemo } from "react";
import { computeTimelineRange, getTotalWidth, format } from "./utils";
import type { ProjectScheduleDTO } from "../types";

interface UseGanttParams {
  schedules: ProjectScheduleDTO[];
  contractDate?: string | null;
  deliveredDate?: string | null;
  completedDate?: string | null;
}

interface InlineCreateState {
  active: boolean;
  date: string; // yyyy-MM-dd
}

export function useGantt({ schedules, contractDate, deliveredDate, completedDate }: UseGanttParams) {
  const range = useMemo(
    () => computeTimelineRange({ schedules, contractDate, deliveredDate, completedDate }),
    [schedules, contractDate, deliveredDate, completedDate]
  );

  const totalWidth = useMemo(() => getTotalWidth(range.start, range.end), [range]);

  // 인라인 생성 상태
  const [inlineCreate, setInlineCreate] = useState<InlineCreateState | null>(null);

  const startInlineCreate = useCallback((date: Date) => {
    setInlineCreate({ active: true, date: format(date, "yyyy-MM-dd") });
  }, []);

  const cancelInlineCreate = useCallback(() => {
    setInlineCreate(null);
  }, []);

  return {
    range,
    totalWidth,
    inlineCreate,
    startInlineCreate,
    cancelInlineCreate,
  };
}
