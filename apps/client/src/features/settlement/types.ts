export interface UncollectedInvoice {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  paymentType: string;
  amount: string;
  collectedAmount: string;
  remainingAmount: string;
  issueDate: string;
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
  uncollectedCount: number;
  unreportedCount: number;
}

export interface SettlementData {
  uncollectedInvoices: UncollectedInvoice[];
  unreportedPartnerPayments: UnreportedPartnerPayment[];
  summary: SettlementSummary;
}
