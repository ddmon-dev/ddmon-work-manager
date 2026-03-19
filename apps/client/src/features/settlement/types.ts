export interface UninvoicedPayment {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  paymentType: string;
  amount: string;
  paidDate: string;
  description: string;
}

export interface UnreportedPartnerPayment {
  id: string;
  projectId: string;
  projectName: string;
  partnerName: string;
  amount: string;
  paidDate: string;
  description: string;
}

export interface SettlementSummary {
  uninvoicedCount: number;
  unreportedCount: number;
}

export interface SettlementData {
  uninvoicedPayments: UninvoicedPayment[];
  unreportedPartnerPayments: UnreportedPartnerPayment[];
  summary: SettlementSummary;
}
