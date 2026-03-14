import { useEffect, useRef } from "react";
import { useQueryParams } from "@/shared/hooks/use-query-params";
import { useManageSheet } from "../_base/ui";

/**
 * URL 파라미터에 따라 프로젝트 시트를 자동으로 엽니다.
 * - id: 해당 프로젝트 상세 시트 열기 (예: /projects?id=uuid)
 * - create_from: 프로젝트 생성 시트 열기 (예: /projects?create_from=EST-2025-001)
 */
export function UrlSheetOpener() {
  const { get } = useQueryParams();
  const idParam = get("id");
  const createFrom = get("create_from");
  const sheet = useManageSheet();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current || sheet.data !== null) return;
    if (idParam) {
      triggered.current = true;
      sheet.open({ id: idParam, mode: "view" });
    } else if (createFrom) {
      triggered.current = true;
      sheet.open({ mode: "create" });
    }
  }, [idParam, createFrom, sheet]);

  return null;
}
