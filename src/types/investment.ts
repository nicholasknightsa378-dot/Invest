export interface SimulationParams {
  initialValue: number;
  monthlyDeposit: number;
  annualRate: number;
  years: number;
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
