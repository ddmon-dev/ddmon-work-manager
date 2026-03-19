import { ManageSheet } from "../_base/ui";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchClientEnvironment } from "./api";
import { CONFIG } from "./config";
import { WriteForm } from "./write-form";
import { DetailView } from "./detail-view";
import type { ClientEnvironmentWithMemos } from "./types";

export function ItemSheet() {
  return (
    <ManageSheet<ClientEnvironmentWithMemos>
      queryKeyFn={(id) => queryKeys.clientEnvironments.detail(id)}
      fetchFn={fetchClientEnvironment}
      formComponent={WriteForm}
      viewComponent={DetailView}
      moduleName={CONFIG.moduleName}
      size={{ create: "lg", modify: "lg", view: "2xl", duplicate: "lg" }}
    />
  );
}
