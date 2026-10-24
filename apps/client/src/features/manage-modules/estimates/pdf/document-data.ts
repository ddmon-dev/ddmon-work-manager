import type { EstimateWithDetails } from '../types';

export interface EstimateDocumentData {
  title: string;
  description?: string;
  clientName?: string;
  estimateNumber?: string;
  version?: number;
  versionLabel?: string;
  issuedDate?: string;
  validUntil?: string;
  // 발행자 정보 (publisher_info 스냅샷)
  issuer?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  // 사업자 정보
  bizName?: string;
  bizNameEn?: string;
  ceo?: string;
  bizNumber?: string;
  bizAddress?: string;
  taxType: string;
  showTaxAmount: boolean;
  discountType: string;
  discountValue: number;
  notes?: string;
  groups: Array<{
    name: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
      amount: number;
    }>;
  }>;
}

/** EstimateWithDetails -> EstimateDocumentData 변환 */
export function toDocumentData(estimate: EstimateWithDetails): EstimateDocumentData {
  const pub = estimate.publisherInfo;
  return {
    title: estimate.title,
    description: estimate.description || undefined,
    clientName: estimate.billingClient?.companyName || estimate.client?.companyName || undefined,
    estimateNumber: estimate.estimateNumber,
    version: estimate.version,
    versionLabel: estimate.versionLabel || undefined,
    issuedDate: estimate.issuedDate || undefined,
    validUntil: estimate.validUntil || undefined,
    issuer: pub?.issuer || undefined,
    issuerPhone: pub?.phone || undefined,
    issuerEmail: pub?.email || undefined,
    bizName: pub?.bizName || undefined,
    bizNameEn: pub?.bizNameEn || undefined,
    ceo: pub?.ceo || undefined,
    bizNumber: pub?.bizNumber || undefined,
    bizAddress: pub?.address || undefined,
    taxType: estimate.taxType,
    showTaxAmount: estimate.showTaxAmount ?? true,
    discountType: estimate.discountType,
    discountValue: Number(estimate.discountValue) || 0,
    notes: estimate.notes || undefined,
    groups: estimate.groups.map(g => ({
      name: g.name,
      items: g.items.map(item => ({
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit ?? '',
        amount: Number(item.amount),
      })),
    })),
  };
}

/** PDF에 출력되는 값만 비교한다. 객체 생성 순서나 내부 버전명은 영향을 주지 않는다. */
export function getEstimateDocumentKey(data: EstimateDocumentData): string {
  return JSON.stringify({
    title: data.title,
    description: data.description || undefined,
    clientName: data.clientName || undefined,
    estimateNumber: data.estimateNumber || undefined,
    issuedDate: data.issuedDate || undefined,
    validUntil: data.validUntil || undefined,
    issuer: data.issuer || undefined,
    issuerPhone: data.issuerPhone || undefined,
    issuerEmail: data.issuerEmail || undefined,
    bizName: data.bizName || undefined,
    bizNameEn: data.bizNameEn || undefined,
    ceo: data.ceo || undefined,
    bizNumber: data.bizNumber || undefined,
    taxType: data.taxType,
    showTaxAmount: data.showTaxAmount,
    discountType: data.discountType,
    discountValue: data.discountValue,
    notes: data.notes || undefined,
    groups: data.groups.map(group => ({
      name: group.name,
      items: group.items.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit, amount: item.amount })),
    })),
  });
}
