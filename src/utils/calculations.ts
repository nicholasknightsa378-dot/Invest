import { SimulationParams, SimulationResult, MonthDataPoint } from '../types/investment';
import { parseCurrencyNumber } from './formatters';

function parseNumericValue(val: string): number {
  if (!val) return 0;
  const normalized = val.replace(',', '.').trim();
  const num = parseFloat(normalized);
  if (isNaN(num) || !isFinite(num) || num < 0) return 0;
  return num;
}

interface ParsedDepositStep {
  startMonth: number;
  newDeposit: number;
}

interface ParsedLumpSum {
  targetMonth: number;
  amount: number;
}

/**
 * Calcula a evolução dos juros compostos mês a mês
 * Suporta mudanças dinâmicas no aporte mensal e aportes únicos em meses específicos
 * Utiliza a taxa mensal equivalente: (1 + taxa anual)^(1/12) - 1
 */
export function calculateCompoundInterest(params: SimulationParams): SimulationResult {
  const initialValue = Math.max(0, Number(params.initialValue) || 0);
  const baseMonthlyDeposit = Math.max(0, Number(params.monthlyDeposit) || 0);
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

  // Processa e filtra os passos de mudança de aporte válidos
  const validSteps: ParsedDepositStep[] = [];
  if (params.depositSteps && params.depositSteps.length > 0) {
    params.depositSteps.forEach(step => {
      const periodVal = parseNumericValue(step.startValue);
      const newDepositVal = parseCurrencyNumber(step.newDeposit);

      if (periodVal > 0 && newDepositVal > 0) {
        const startMonth =
          step.unit === 'year'
            ? Math.round((periodVal - 1) * 12 + 1)
            : Math.round(periodVal);

        // Ignora se o período for maior que o prazo total ou menor que 1
        if (startMonth >= 1 && startMonth <= totalMonths) {
          validSteps.push({ startMonth, newDeposit: newDepositVal });
        }
      }
    });
  }

  // Processa e filtra os aportes únicos válidos
  const validLumpSums: ParsedLumpSum[] = [];
  if (params.lumpSums && params.lumpSums.length > 0) {
    params.lumpSums.forEach(lump => {
      const periodVal = parseNumericValue(lump.periodValue);
      const amountVal = parseCurrencyNumber(lump.amount);

      if (periodVal > 0 && amountVal > 0) {
        const targetMonth =
          lump.unit === 'year'
            ? Math.round((periodVal - 1) * 12 + 1)
            : Math.round(periodVal);

        // Ignora se o período for maior que o prazo total ou menor que 1
        if (targetMonth >= 1 && targetMonth <= totalMonths) {
          validLumpSums.push({ targetMonth, amount: amountVal });
        }
      }
    });
  }

  let firstMonthInterest = 0;
  let lastMonthInterest = 0;

  for (let m = 1; m <= totalMonths; m++) {
    // 1. Determina o aporte mensal regular aplicável a este mês
    let currentRegularDeposit = baseMonthlyDeposit;
    const activeSteps = validSteps.filter(s => s.startMonth <= m);
    if (activeSteps.length > 0) {
      // Ordena por mês inicial; o mais recente vigente prevalece
      activeSteps.sort((a, b) => a.startMonth - b.startMonth);
      currentRegularDeposit = activeSteps[activeSteps.length - 1].newDeposit;
    }

    // 2. Determina aportes únicos no mês m
    let lumpSumThisMonth = 0;
    validLumpSums
      .filter(l => l.targetMonth === m)
      .forEach(l => {
        lumpSumThisMonth += l.amount;
      });

    // 3. Total aportado no mês
    const totalDepositedThisMonth = currentRegularDeposit + lumpSumThisMonth;

    // 4. Saldo que rende juros no mês (saldo anterior + aportes do início do mês)
    const baseForMonth = currentBalance + totalDepositedThisMonth;
    const interestThisMonth = baseForMonth * monthlyRate;

    currentBalance = baseForMonth + interestThisMonth;
    totalInvested += totalDepositedThisMonth;
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
