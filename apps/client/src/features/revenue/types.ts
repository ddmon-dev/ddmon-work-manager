export interface MonthlyData {
  month: string;
  contract: number;
  payment: number;
}

export interface OutstandingProject {
  id: string;
  name: string;
  clientName: string;
  netReceivableAmount: number;
  paidAmount: number;
  outstanding: number;
  status: string;
}

export interface YearlySummary {
  year: number;
  contractTotal: number;
  netReceivableTotal: number;
  paymentTotal: number;
  outstanding: number;
  collectionRate: number;
}

export interface RevenueData {
  prevYearSummary: YearlySummary;
  currentYearSummary: YearlySummary;
  cumulativeOutstanding: number;
  monthlyData: MonthlyData[];
  outstandingProjects: OutstandingProject[];
}
