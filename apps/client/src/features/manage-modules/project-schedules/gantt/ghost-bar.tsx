import {
  DAY_WIDTH,
  ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
  BAR_INSET,
  dateToX,
  parseISO,
  differenceInCalendarDays,
} from "./utils";

interface GhostBarProps {
  startDate: string;
  endDate?: string;
  rowIndex: number;
  rangeStart: Date;
}

export function GhostBar({ startDate, endDate, rowIndex, rangeStart }: GhostBarProps) {
  const ghostLeft = dateToX(parseISO(startDate), rangeStart) + BAR_INSET;
  const days = endDate
    ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
    : 1;
  const ghostWidth = Math.max(days * DAY_WIDTH - BAR_INSET * 2, DAY_WIDTH - BAR_INSET * 2);
  const ghostTop = rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;

  return (
    <div
      data-gantt-bar
      className="absolute rounded-md bg-primary/20 border border-primary/40 z-20"
      style={{ left: ghostLeft, width: ghostWidth, top: ghostTop, height: BAR_HEIGHT }}
    />
  );
}
