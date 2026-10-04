import { SimulationParams, SimulationResult, MonthDataPoint } from '../types/investment';

/**
 * Calcula a evolução dos juros compostos mês a mês
 * Utiliza a taxa mensal equivalente: (1 + taxa anual)^(1/12) - 1
 */
export function calculateCompoundInterest(params: SimulationParams): SimulationResult {
  const initialValue = Math.max(0, Number(params.initialValue) || 0);
  const monthlyDeposit = Math.max(0, Number(params.monthlyDeposit) || 0);
  const annualRate = Math.max(0, Number(params.annualRate) || 0);
  const years = Math.max(0, Number(params.years) || 0);

  const totalMonths = Math.round(years * 12);

  // Taxa mensal equivalente exata: (1 + i_a)^(1/12) - 1
  const monthlyRate = annualRate > 0 ? Math.pow(1 + annualRate / 100, 1 / 12) - 1 : 0;

  let currentBalance = initialValue;
  let totalInvested = initialValue;

  const monthlyData: MonthDataPoint[] = [
    {
      month: 0,
      year: 0,
      totalInvested: initialValue,
      interestThisMonth: 0,
      totalInterest: 0,
      totalAccumulated: initialValue,
    },
  ];

  if (totalMonths <= 0) {
    return {
      totalInvested: initialValue,
      totalInterest: 0,
      finalValue: initialValue,
      firstMonthInterest: 0,
      lastMonthInterest: 0,
      monthlyData,
    };
  }

  let firstMonthInterest = 0;
  let lastMonthInterest = 0;

  for (let m = 1; m <= totalMonths; m++) {
    // Saldo que rende juros no mês (saldo anterior + aporte do início do mês)
    const baseForMonth = currentBalance + monthlyDeposit;
    const interestThisMonth = baseForMonth * monthlyRate;

    currentBalance = baseForMonth + interestThisMonth;
    totalInvested += monthlyDeposit;
    const totalInterest = Math.max(0, currentBalance - totalInvested);

    if (m === 1) {
      firstMonthInterest = interestThisMonth;
    }
    if (m === totalMonths) {
      lastMonthInterest = interestThisMonth;
    }

    monthlyData.push({
      month: m,
      year: Math.floor((m - 1) / 12) + 1,
      totalInvested: Math.round(totalInvested * 100) / 100,
      interestThisMonth: Math.round(interestThisMonth * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalAccumulated: Math.round(currentBalance * 100) / 100,
    });
  }

  const finalPoint = monthlyData[monthlyData.length - 1];

  return {
    totalInvested: finalPoint.totalInvested,
    totalInterest: finalPoint.totalInterest,
    finalValue: finalPoint.totalAccumulated,
    firstMonthInterest: Math.round(firstMonthInterest * 100) / 100,
    lastMonthInterest: Math.round(lastMonthInterest * 100) / 100,
    monthlyData,
  };
}
