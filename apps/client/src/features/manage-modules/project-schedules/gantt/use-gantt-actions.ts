import { useState, useCallback } from "react";
import { useCreateProjectSchedule, useUpdateProjectSchedule } from "../api";
import type { ProjectScheduleDTO } from "../types";
import { format } from "./utils";

interface LaneInfo {
  laneId: string;
  projectId: string;
}

export interface CreateState {
  projectId: string;
  laneId: string;
  startDate: string;
  endDate?: string;
  rowIndex: number;
  anchorRect: DOMRect;
}

export interface PopoverState {
  schedule: ProjectScheduleDTO;
  rect: DOMRect;
}

interface UseGanttActionsParams {
  resolveLane: (rowIndex: number) => LaneInfo | null;
  isCollapsedRow?: (rowIndex: number) => string | null;
  onToggle?: (projectId: string) => void;
}

export function useGanttActions({ resolveLane, isCollapsedRow, onToggle }: UseGanttActionsParams) {
  const createSchedule = useCreateProjectSchedule();
  const updateSchedule = useUpdateProjectSchedule();

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [createState, setCreateState] = useState<CreateState | null>(null);

  const handleEmptyClick = useCallback((date: Date, rowIndex: number, anchorRect: DOMRect) => {
    if (isCollapsedRow && onToggle) {
      const collapsedProjectId = isCollapsedRow(rowIndex);
      if (collapsedProjectId) {
        onToggle(collapsedProjectId);
        return;
      }
    }

    const lane = resolveLane(rowIndex);
    if (!lane) return;

    setPopover(null);
    setCreateState({
      projectId: lane.projectId,
      laneId: lane.laneId,
      startDate: format(date, "yyyy-MM-dd"),
      rowIndex,
      anchorRect,
    });
  }, [resolveLane, isCollapsedRow, onToggle]);

  const handleDragCreate = useCallback((startDate: Date, endDate: Date, rowIndex: number, anchorRect: DOMRect) => {
    const lane = resolveLane(rowIndex);
    if (!lane) return;

    setPopover(null);
    setCreateState({
      projectId: lane.projectId,
      laneId: lane.laneId,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      rowIndex,
      anchorRect,
    });
  }, [resolveLane]);

  const handleBarClick = useCallback((schedule: ProjectScheduleDTO, rect: DOMRect) => {
    setCreateState(null);
    setPopover({ schedule, rect });
  }, []);

  const handleDuplicate = useCallback((schedule: ProjectScheduleDTO, newStartDate: string, newEndDate: string | null) => {
    createSchedule.mutate({
      title: schedule.title,
      startDate: newStartDate,
      endDate: newEndDate,
      projectId: schedule.projectId,
      laneId: schedule.laneId,
      category: schedule.category,
      categoryColor: schedule.categoryColor,
    });
  }, [createSchedule]);

  const handleDateChange = useCallback((id: string, newStartDate: string, newEndDate: string | null) => {
    updateSchedule.mutate({ id, data: { startDate: newStartDate, endDate: newEndDate } });
  }, [updateSchedule]);

  const handleRowChange = useCallback((scheduleId: string, fromRow: number, toRow: number) => {
    if (fromRow === toRow) return;
    const lane = resolveLane(toRow);
    if (lane) {
      updateSchedule.mutate({ id: scheduleId, data: { laneId: lane.laneId } });
    }
  }, [resolveLane, updateSchedule]);

  const handleCreateSubmit = useCallback((title: string | null, category: string, categoryColor: string | null) => {
    if (!createState) return;
    createSchedule.mutate({
      title,
      startDate: createState.startDate,
      endDate: createState.endDate,
      projectId: createState.projectId,
      laneId: createState.laneId,
      category,
      categoryColor,
    });
    setCreateState(null);
  }, [createState, createSchedule]);

  return {
    popover, setPopover,
    createState, setCreateState,
    handleEmptyClick,
    handleDragCreate,
    handleBarClick,
    handleDuplicate,
    handleDateChange,
    handleRowChange,
    handleCreateSubmit,
  };
}
