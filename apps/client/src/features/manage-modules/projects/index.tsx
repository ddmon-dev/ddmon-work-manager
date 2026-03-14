import { APP_CONFIG } from "@/app.config";
import { useQueryParams } from "@/shared/hooks/use-query-params";
import { CategoryButtonGroup } from "@/shared/ui/category-button-group";
import { ManageContainer } from "../_base/ui/manage-container";
import { useProjectList } from "./api";
import { CONFIG } from "./config";
import { List } from "./list";
import { ItemSheet } from "./item-sheet";
import { UrlSheetOpener } from "./url-sheet-opener";

const PROJECT_CATEGORIES = [
  { value: "incomplete", label: "진행중" },
  { value: "completed", label: "완료" },
  { value: "discarded", label: "폐기" },
];

export function ProjectsModule() {
  const { get } = useQueryParams();
  const page = Number(get("page") ?? 1);
  const pageSize = Number(
    get("pageSize") ?? APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS[0]
  );
  const search = get("search") ?? undefined;
  const category = get("category") || PROJECT_CATEGORIES[0].value;

  const { data, isLoading } = useProjectList({ page, pageSize, search, category });

  const items = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  return (
    <ManageContainer
      moduleName={CONFIG.moduleName}
      headerAddons={<CategoryButtonGroup options={PROJECT_CATEGORIES} showAllOption={false} />}
    >
      <List data={items} totalCount={totalCount} isLoading={isLoading} />
      <ItemSheet />
      <UrlSheetOpener />
    </ManageContainer>
  );
}
