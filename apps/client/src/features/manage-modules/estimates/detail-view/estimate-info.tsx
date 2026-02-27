import { DetailInfoRow } from "../../_base/ui";
import { TAX_OPTIONS } from "../constants";
import type { EstimateWithDetails } from "../types";

export function EstimateInfo({ data }: { data: EstimateWithDetails }) {
  const taxLabel = TAX_OPTIONS.find((o) => o.value === data.taxType)?.label ?? data.taxType;

  return (
    <>
      <DetailInfoRow label="발행자" value={data.issuer ?? undefined} />
      <DetailInfoRow label="발행일" value={data.issuedDate ?? undefined} />
      <DetailInfoRow label="유효기간" value={data.validUntil ?? undefined} />
      <DetailInfoRow label="세금 타입" value={taxLabel} />
      {data.versionLabel && (
        <DetailInfoRow label="버전명" value={data.versionLabel} />
      )}
    </>
  );
}
