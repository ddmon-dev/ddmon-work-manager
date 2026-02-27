import { ManageSheet } from "../_base/ui";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchSchedule } from "./api";
import { CONFIG } from "./config";
import { WriteForm } from "./write-form";
import { DetailView } from "./detail-view";
import type { ScheduleDTO } from "./types";

export function ItemSheet() {
  return (
    <ManageSheet<ScheduleDTO>
      queryKeyFn={(id) => queryKeys.schedules.detail(id)}
      fetchFn={fetchSchedule}
      formComponent={WriteForm}
      viewComponent={DetailView}
      moduleName={CONFIG.moduleName}
    />
  );
}
