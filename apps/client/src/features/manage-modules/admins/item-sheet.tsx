import { ManageSheet } from "../_base/ui";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchAdmin } from "./api";
import { CONFIG } from "./config";
import { WriteForm } from "./write-form";
import type { AdminDTO } from "./types";

export function ItemSheet() {
  return (
    <ManageSheet<AdminDTO>
      queryKeyFn={(id) => queryKeys.admins.detail(id)}
      fetchFn={fetchAdmin}
      formComponent={WriteForm}
      moduleName={CONFIG.moduleName}
    />
  );
}
