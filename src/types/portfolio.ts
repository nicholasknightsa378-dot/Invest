export type InvestmentType = 'Poupança' | 'Renda fixa' | 'Ações/Fundos' | 'Outro';

export interface InvestmentAporte {
  id: string;
  date: string; // formato YYYY-MM-DD
  amount: string; // valor digitado pelo usuário (ex: "1.000")
}

export interface InvestmentItem {
  id: string;
  name: string; // ex: "Nubank caixinha"
  type: InvestmentType;
  annualRate: string; // ex: "12,5"
  manualCurrentValue?: string; // opcional: valor atual real informado pelo usuário (ex: "5.200")
  aportes: InvestmentAporte[];
}

export interface InvestmentCalculated {
  id: string;
  name: string;
  type: InvestmentType;
  annualRate: number;
  totalInvested: number;
  currentValue: number;
  isManualValue: boolean; // se o valor atual é o manual informado ou estimado pela taxa
  returnAmount: number;
  returnPercentage: number;
  aportes: {
    id: string;
    date: string;
    amount: number;
    currentValue: number;
  }[];
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalReturnAmount: number;
  totalReturnPercentage: number;
  byType: {
    type: InvestmentType;
    totalInvested: number;
    currentValue: number;
    percentage: number;
    color: string;
  }[];
}
