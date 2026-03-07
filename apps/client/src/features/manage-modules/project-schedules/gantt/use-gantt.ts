import { useMemo } from "react";
import { computeTimelineRange, getTotalWidth } from "./utils";
import type { ProjectScheduleDTO } from "../types";

interface UseGanttParams {
  schedules: ProjectScheduleDTO[];
  contractDate?: string | null;
  deliveredDate?: string | null;
  completedDate?: string | null;
}

export function useGantt({ schedules, contractDate, deliveredDate, completedDate }: UseGanttParams) {
  const range = useMemo(
    () => computeTimelineRange({ schedules, contractDate, deliveredDate, completedDate }),
    [schedules, contractDate, deliveredDate, completedDate]
  );

  const totalWidth = useMemo(() => getTotalWidth(range.start, range.end), [range]);

  return { range, totalWidth };
}
