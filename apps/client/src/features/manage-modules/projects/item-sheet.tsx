import { ManageSheet } from "../_base/ui";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchProject } from "./api";
import { CONFIG } from "./config";
import { WriteForm } from "./write-form";
import { DetailView, ProjectDetailHeader } from "./detail-view";
import type { ProjectWithDetails } from "./types";

export function ItemSheet() {
  return (
    <ManageSheet<ProjectWithDetails>
      queryKeyFn={(id) => queryKeys.projects.detail(id)}
      fetchFn={fetchProject}
      formComponent={WriteForm}
      viewComponent={DetailView}
      viewHeader={ProjectDetailHeader}
      moduleName={CONFIG.moduleName}
      size={{ view: "md:max-w-[58vw]", modify: "lg", create: "lg" }}
    />
  );
}
