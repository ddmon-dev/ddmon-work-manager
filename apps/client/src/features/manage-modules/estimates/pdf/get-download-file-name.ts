import { format } from "date-fns";

interface Params {
  bizName?: string;
  title: string;
  issuedDate?: string | null;
}

export function getDownloadFileName({
  bizName,
  title,
  issuedDate,
}: Params): string {
  const bizPrefix = bizName ? `[${bizName}]_` : "";
  const safeTitle = title.replace(/\s+/g, "_");
  const dateStr = issuedDate
    ? issuedDate.replace(/-/g, "")
    : format(new Date(), "yyyyMMdd");
  return `${bizPrefix}견적서_${safeTitle}_${dateStr}.pdf`;
}
