import { useQueryParams } from "@/shared/hooks/use-query-params";
import { AppHeader } from "@/shared/ui/app-header";
import { Badge } from "@/shared/ui/badge";
import { Container } from "@/shared/ui/container";
import { useSettlementData } from "./api";
import { InvoiceSection } from "./invoice-section";
import { MonthFilter } from "./month-filter";
import { WithholdingSection } from "./withholding-section";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

export function SettlementModule() {
  const { get } = useQueryParams();
  const year = Number(get("year")) || CURRENT_YEAR;
  const month = Number(get("month")) || CURRENT_MONTH;
  const { data, isLoading } = useSettlementData(year, month);

  return (
    <>
      <AppHeader title="정산" />
      <Container className="flex flex-col gap-6 py-6">
        <div className="flex items-center justify-between">
          <MonthFilter year={year} month={month} />
          {data && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                세금계산서 미발행 {data.summary.uninvoicedCount}건
              </Badge>
              <Badge variant="outline">
                원천세 미신고 {data.summary.unreportedCount}건
              </Badge>
            </div>
          )}
        </div>

        {!isLoading && data ? (
          <>
            <InvoiceSection
              payments={data.uninvoicedPayments}
              year={year}
              month={month}
            />
            <WithholdingSection
              payments={data.unreportedPartnerPayments}
              year={year}
              month={month}
            />
          </>
        ) : null}
      </Container>
    </>
  );
}
