import { ManageSheet } from "../_base/ui";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchPartner } from "./api";
import { CONFIG } from "./config";
import { WriteForm } from "./write-form";
import { DetailView } from "./detail-view";
import type { PartnerWithMemos } from "./types";

export function ItemSheet() {
  return (
    <ManageSheet<PartnerWithMemos>
      queryKeyFn={(id) => queryKeys.partners.detail(id)}
      fetchFn={fetchPartner}
      formComponent={WriteForm}
      viewComponent={DetailView}
      moduleName={CONFIG.moduleName}
      size={{ create: "md", modify: "md", view: "2xl", duplicate: "md" }}
    />
  );
}
