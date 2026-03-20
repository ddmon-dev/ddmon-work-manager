// ── Revenue 타입 ─────────────────────────────────────────────

export interface MonthlyData {
  month: string;
  supply: number;
  payment: number;
}

export interface OutstandingProject {
  id: string;
  name: string;
  clientName: string;
  taxType: string | null;
  contractAmount: number;
  paidAmount: number;
  outstanding: number;
  status: string;
}

export interface YearlySummary {
  year: number;
  supplyTotal: number;
  paymentTotal: number;
  outstanding: number;
  collectionRate: number;
  vatTotal: number;
  vatCollected: number;
  vatOutstanding: number;
}

export interface RevenueData {
  prevYearSummary: YearlySummary;
  currentYearSummary: YearlySummary;
  cumulativeOutstanding: number;
  cumulativeVatOutstanding: number;
  monthlyData: MonthlyData[];
  outstandingProjects: OutstandingProject[];
}

// ── Settlement 타입 ──────────────────────────────────────────

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
