import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useManageSheet } from "../_base/ui";

/**
 * URL에 create_from 파라미터가 있을 때 프로젝트 생성 시트를 자동으로 엽니다.
 * 예: /projects?create_from=EST-2025-001
 */
export function AutoCreateSheet() {
  const [searchParams] = useSearchParams();
  const createFrom = searchParams.get("create_from");
  const sheet = useManageSheet();
  const triggered = useRef(false);

  useEffect(() => {
    if (!createFrom || triggered.current || sheet.data !== null) return;
    triggered.current = true;
    sheet.open({ mode: "create" });
  }, [createFrom, sheet]);

  return null;
}
