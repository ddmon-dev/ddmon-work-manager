import { ManageSheet } from "../_base/ui";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchClient } from "./api";
import { CONFIG } from "./config";
import { WriteForm } from "./write-form";
import { DetailView } from "./detail-view";
import type { ClientWithMemos } from "./types";

export function ItemSheet() {
  return (
    <ManageSheet<ClientWithMemos>
      queryKeyFn={(id) => queryKeys.clients.detail(id)}
      fetchFn={fetchClient}
      formComponent={WriteForm}
      viewComponent={DetailView}
      moduleName={CONFIG.moduleName}
      size={{ create: "md", modify: "md", view: "xs", duplicate: "md" }}
    />
  );
}
