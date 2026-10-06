import { InvestmentItem, InvestmentCalculated, PortfolioSummary, InvestmentType } from '../types/portfolio';
import { parseCurrencyNumber } from './formatters';

function parseRateNumber(val: string): number {
  if (!val) return 0;
  const normalized = val.replace(',', '.').trim();
  const num = parseFloat(normalized);
  if (isNaN(num) || !isFinite(num) || num < 0) return 0;
  return num;
}

export const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  Poupança: '#3b82f6', // Azul
  'Renda fixa': '#10b981', // Verde esmeralda
  'Ações/Fundos': '#8b5cf6', // Roxo
  Outro: '#f59e0b', // Âmbar
};

export const ALL_INVESTMENT_TYPES: InvestmentType[] = [
  'Poupança',
  'Renda fixa',
  'Ações/Fundos',
  'Outro',
];

/**
 * Calcula o valor atualizado de um aporte único com juros compostos
 * usando a taxa mensal equivalente: (1 + taxa anual)^(1/12) - 1.
 * Aportes com data futura não rendem ainda.
 */
export function calculateAporteCurrentValue(
  amount: number,
  dateStr: string,
  annualRatePercent: number,
  today: Date = new Date()
): number {
  if (amount <= 0 || isNaN(amount) || !isFinite(amount)) return 0;
  if (annualRatePercent <= 0 || isNaN(annualRatePercent)) return amount;

  if (!dateStr) return amount;

  // Trata a data YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length !== 3) return amount;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const aporteDate = new Date(year, month, day);
  if (isNaN(aporteDate.getTime())) return amount;

  // Zera horas para comparação puramente em dias
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const aporteZero = new Date(aporteDate.getFullYear(), aporteDate.getMonth(), aporteDate.getDate());

  // Aportes com data futura não rendem ainda
  if (aporteZero.getTime() >= todayZero.getTime()) {
    return amount;
  }

  // Dias decorridos
  const diffTime = todayZero.getTime() - aporteZero.getTime();
  const diffDays = Math.max(0, diffTime / (1000 * 60 * 60 * 24));

  // Média de dias por mês (365.25 / 12 = 30.4375 dias)
  const elapsedMonths = diffDays / 30.4375;

  // Taxa mensal equivalente: (1 + taxa anual)^(1/12) - 1
  const monthlyRate = Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1;

  if (monthlyRate <= 0) return amount;

  // Juros compostos: valor * (1 + taxa mensal)^meses
  const currentValue = amount * Math.pow(1 + monthlyRate, elapsedMonths);

  if (isNaN(currentValue) || !isFinite(currentValue) || currentValue < amount) {
    return amount;
  }

  return currentValue;
}

/**
 * Calcula os totais de um investimento
 */
export function calculateInvestment(
  item: InvestmentItem,
  today: Date = new Date()
): InvestmentCalculated {
  const rate = parseRateNumber(item.annualRate);
  let totalInvested = 0;
  let estimatedValue = 0;

  const calculatedAportes = item.aportes.map(aporte => {
    const amountNum = parseCurrencyNumber(aporte.amount);
    const aporteCurrent = calculateAporteCurrentValue(amountNum, aporte.date, rate, today);

    totalInvested += amountNum;
    estimatedValue += aporteCurrent;

    return {
      id: aporte.id,
      date: aporte.date,
      amount: amountNum,
      currentValue: aporteCurrent,
    };
  });

  // Se manualCurrentValue estiver preenchido, usa esse valor; senão, usa a estimativa por taxa
  const hasManual = Boolean(
    item.manualCurrentValue !== undefined && item.manualCurrentValue.trim() !== ''
  );
  const isManualValue = hasManual;
  const currentValue = hasManual ? parseCurrencyNumber(item.manualCurrentValue!) : estimatedValue;

  // Rendimento = valor atual - total aportado (aceita negativo)
  const returnAmount = currentValue - totalInvested;
  const returnPercentage =
    totalInvested > 0 ? (returnAmount / totalInvested) * 100 : 0;

  return {
    id: item.id,
    name: item.name || 'Sem nome',
    type: item.type,
    annualRate: rate,
    totalInvested,
    currentValue,
    isManualValue,
    returnAmount,
    returnPercentage,
    aportes: calculatedAportes,
  };
}

/**
 * Calcula o resumo consolidado de toda a carteira
 */
export function calculatePortfolioSummary(
  investments: InvestmentItem[],
  today: Date = new Date()
): PortfolioSummary {
  let totalInvested = 0;
  let currentValue = 0;

  const typeSums: Record<InvestmentType, { totalInvested: number; currentValue: number }> = {
    Poupança: { totalInvested: 0, currentValue: 0 },
    'Renda fixa': { totalInvested: 0, currentValue: 0 },
    'Ações/Fundos': { totalInvested: 0, currentValue: 0 },
    Outro: { totalInvested: 0, currentValue: 0 },
  };

  investments.forEach(item => {
    const calc = calculateInvestment(item, today);
    totalInvested += calc.totalInvested;
    currentValue += calc.currentValue;

    const t = item.type in typeSums ? item.type : 'Outro';
    typeSums[t].totalInvested += calc.totalInvested;
    typeSums[t].currentValue += calc.currentValue;
  });

  const totalReturnAmount = currentValue - totalInvested;
  const totalReturnPercentage =
    totalInvested > 0 ? (totalReturnAmount / totalInvested) * 100 : 0;

  const byType = ALL_INVESTMENT_TYPES.map(type => {
    const val = typeSums[type].currentValue;
    const percentage = currentValue > 0 ? (val / currentValue) * 100 : 0;

    return {
      type,
      totalInvested: typeSums[type].totalInvested,
      currentValue: val,
      percentage,
      color: INVESTMENT_TYPE_COLORS[type],
    };
  });

  return {
    totalInvested,
    currentValue,
    totalReturnAmount,
    totalReturnPercentage,
    byType,
  };
}
