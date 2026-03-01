import { FileText, Search } from "lucide-react";
import { useQueryParams } from "@/shared/hooks/use-query-params";

interface EmptyMessage {
  icon?: React.ReactNode;
  title?: string;
  description: string;
  action?: React.ReactNode;
}

const emptyMessages: Record<string, EmptyMessage> = {
  default: {
    icon: <FileText />,
    title: "No Contents Yet",
    description: "아직 생성된 데이터가 없습니다.",
    action: null,
  },
  search: {
    icon: <Search />,
    title: "No Results Found",
    description: "검색 결과가 없습니다. 다른 검색어를 시도해주세요.",
  },
};

export function ListEmpty({ message }: { message?: EmptyMessage }) {
  const { get } = useQueryParams();
  const search = get("search");
  const content = message ?? (search ? emptyMessages.search : emptyMessages.default);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {content.icon && (
        <div className="text-muted-foreground/50 size-12 [&>svg]:size-full">
          {content.icon}
        </div>
      )}
      {content.title && (
        <p className="text-base font-semibold text-foreground">{content.title}</p>
      )}
      {content.description && (
        <p className="text-sm text-muted-foreground">{content.description}</p>
      )}
      {content.action && <div className="mt-2">{content.action}</div>}
    </div>
  );
}
