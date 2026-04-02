import { format } from "date-fns";

interface Params {
  bizName?: string;
  title: string;
  issuedDate?: string | null;
  version?: number;
}

export function getDownloadFileName({
  bizName,
  title,
  issuedDate,
  version,
}: Params): string {
  const bizPrefix = bizName ? `[${bizName}]` : "";
  const dateStr = issuedDate
    ? issuedDate.replace(/-/g, "")
    : format(new Date(), "yyyyMMdd");
  const versionSuffix = version && version > 1 ? `_v${version}` : "";
  return `${bizPrefix}견적서_${title}_${dateStr}${versionSuffix}.pdf`;
}
