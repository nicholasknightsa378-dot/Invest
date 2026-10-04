export type PeriodUnit = 'month' | 'year';

export interface DepositStep {
  id: string;
  startValue: string; // ex: "4" (a partir do ano 4 ou mês 15)
  unit: PeriodUnit; // 'month' | 'year'
  newDeposit: string; // ex: "2.000"
}

export interface LumpSumDeposit {
  id: string;
  periodValue: string; // ex: "12" ou "2" (no mês 12 ou ano 2)
  unit: PeriodUnit; // 'month' | 'year'
  amount: string; // ex: "10.000"
}

export interface SimulationParams {
  initialValue: number;
  monthlyDeposit: number;
  annualRate: number;
  years: number;
  depositSteps?: DepositStep[];
  lumpSums?: LumpSumDeposit[];
}

export interface MonthDataPoint {
  month: number;
  year: number;
  totalInvested: number;
  interestThisMonth: number;
  totalInterest: number;
  totalAccumulated: number;
}

export interface SimulationResult {
  totalInvested: number;
  totalInterest: number;
  finalValue: number;
  firstMonthInterest: number;
  lastMonthInterest: number;
  monthlyData: MonthDataPoint[];
}
