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
