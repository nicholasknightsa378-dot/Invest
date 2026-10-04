import { useState, useMemo, useEffect } from 'react';
import { calculateCompoundInterest } from './utils/calculations';
import {
  formatCurrency,
  formatThousandsInput,
  parseCurrencyNumber,
} from './utils/formatters';
import { DepositStep, LumpSumDeposit, PeriodUnit } from './types/investment';
import CompoundChart from './components/CompoundChart';

const STORAGE_KEY = 'meu_investimento_params_v4';

function sanitizeRateInput(val: string): string {
  // Remove sinais negativos e caracteres inválidos, preservando números, vírgula e ponto
  return val.replace(/-/g, '').replace(/[^0-9.,]/g, '');
}

function parseRateNumber(val: string): number {
  if (!val) return 0;
  // Converte vírgula para ponto e converte para float
  const normalized = val.replace(',', '.').trim();
  const num = parseFloat(normalized);
  if (isNaN(num) || !isFinite(num) || num < 0) return 0;
  return num;
}

export default function App() {
  const [initialValueStr, setInitialValueStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.initialValue !== undefined) {
          return formatThousandsInput(String(parsed.initialValue));
        }
      }
    } catch {
      // Ignora erro
    }
    return '1.000';
  });

  const [monthlyDepositStr, setMonthlyDepositStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.monthlyDeposit !== undefined) {
          return formatThousandsInput(String(parsed.monthlyDeposit));
        }
      }
    } catch {
      // Ignora erro
    }
    return '300';
  });

  const [annualRateStr, setAnnualRateStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.annualRate !== undefined) return String(parsed.annualRate);
      }
    } catch {
      // Ignora erro
    }
    return '10';
  });

  const [yearsStr, setYearsStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.years !== undefined) return String(parsed.years);
      }
    } catch {
      // Ignora erro
    }
    return '5';
  });

  const [inflationRateStr, setInflationRateStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inflationRate !== undefined) return String(parsed.inflationRate);
      }
    } catch {
      // Ignora erro
    }
    return '4';
  });

  const [goalStr, setGoalStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.goal !== undefined) {
          return formatThousandsInput(String(parsed.goal));
        }
      }
    } catch {
      // Ignora erro
    }
    return '100.000';
  });

  // Opções Avançadas: recolhidas por padrão
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isAdvancedOpen !== undefined) return Boolean(parsed.isAdvancedOpen);
      }
    } catch {
      // Ignora erro
    }
    return false;
  });

  // Mudanças de aporte mensal
  const [depositSteps, setDepositSteps] = useState<DepositStep[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.depositSteps)) return parsed.depositSteps;
      }
    } catch {
      // Ignora erro
    }
    return [];
  });

  // Aportes únicos
  const [lumpSums, setLumpSums] = useState<LumpSumDeposit[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.lumpSums)) return parsed.lumpSums;
      }
    } catch {
      // Ignora erro
    }
    return [];
  });

  // Salva no localStorage quando os valores mudam
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          initialValue: initialValueStr,
          monthlyDeposit: monthlyDepositStr,
          annualRate: annualRateStr,
          years: yearsStr,
          inflationRate: inflationRateStr,
          goal: goalStr,
          isAdvancedOpen,
          depositSteps,
          lumpSums,
        })
      );
    } catch {
      // Ignora erro
    }
  }, [
    initialValueStr,
    monthlyDepositStr,
    annualRateStr,
    yearsStr,
    inflationRateStr,
    goalStr,
    isAdvancedOpen,
    depositSteps,
    lumpSums,
  ]);

  // Manipuladores de Mudança de Aporte
  const handleAddStep = () => {
    setDepositSteps(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        startValue: '',
        unit: 'year',
        newDeposit: '',
      },
    ]);
  };

  const handleUpdateStep = (
    id: string,
    field: keyof Omit<DepositStep, 'id'>,
    value: string
  ) => {
    setDepositSteps(prev =>
      prev.map(step => {
        if (step.id !== id) return step;
        if (field === 'newDeposit') {
          return { ...step, newDeposit: formatThousandsInput(value) };
        }
        if (field === 'startValue') {
          return { ...step, startValue: sanitizeRateInput(value) };
        }
        if (field === 'unit') {
          return { ...step, unit: value as PeriodUnit };
        }
        return step;
      })
    );
  };

  const handleRemoveStep = (id: string) => {
    setDepositSteps(prev => prev.filter(step => step.id !== id));
  };

  // Manipuladores de Aporte Único
  const handleAddLumpSum = () => {
    setLumpSums(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        periodValue: '',
        unit: 'year',
        amount: '',
      },
    ]);
  };

  const handleUpdateLumpSum = (
    id: string,
    field: keyof Omit<LumpSumDeposit, 'id'>,
    value: string
  ) => {
    setLumpSums(prev =>
      prev.map(lump => {
        if (lump.id !== id) return lump;
        if (field === 'amount') {
          return { ...lump, amount: formatThousandsInput(value) };
        }
        if (field === 'periodValue') {
          return { ...lump, periodValue: sanitizeRateInput(value) };
        }
        if (field === 'unit') {
          return { ...lump, unit: value as PeriodUnit };
        }
        return lump;
      })
    );
  };

  const handleRemoveLumpSum = (id: string) => {
    setLumpSums(prev => prev.filter(lump => lump.id !== id));
  };

  // Cálculos reativos protegidos contra NaN e negativos com opções avançadas
  const result = useMemo(() => {
    const initialValue = parseCurrencyNumber(initialValueStr);
    const monthlyDeposit = parseCurrencyNumber(monthlyDepositStr);
    const annualRate = parseRateNumber(annualRateStr);
    const years = parseRateNumber(yearsStr);

    return calculateCompoundInterest({
      initialValue,
      monthlyDeposit,
      annualRate,
      years,
      depositSteps,
      lumpSums,
    });
  }, [initialValueStr, monthlyDepositStr, annualRateStr, yearsStr, depositSteps, lumpSums]);

  // Cálculo automático do Imposto de Renda (tabela regressiva da renda fixa sobre os juros)
  const { irRatePercentText, irValue, netValue } = useMemo(() => {
    const years = parseRateNumber(yearsStr);
    const totalMonths = Math.round(years * 12);
    let rate = 0.15;
    let text = '15%';

    if (totalMonths <= 6) {
      rate = 0.225;
      text = '22,5%';
    } else if (totalMonths <= 12) {
      rate = 0.20;
      text = '20%';
    } else if (totalMonths <= 24) {
      rate = 0.175;
      text = '17,5%';
    } else {
      rate = 0.15;
      text = '15%';
    }

    const irVal = Math.max(0, result.totalInterest * rate);
    const netVal = Math.max(0, result.totalInvested + result.totalInterest - irVal);

    return {
      irRate: rate,
      irRatePercentText: text,
      irValue: irVal,
      netValue: netVal,
    };
  }, [result.totalInterest, result.totalInvested, yearsStr]);

  // Em valores de hoje = valor líquido / (1 + inflação)^anos
  const realNetValue = useMemo(() => {
    const inflationRate = parseRateNumber(inflationRateStr);
    const years = parseRateNumber(yearsStr);
    if (inflationRate > 0 && years > 0) {
      const factor = Math.pow(1 + inflationRate / 100, years);
      return factor > 0 ? netValue / factor : netValue;
    }
    return netValue;
  }, [netValue, inflationRateStr, yearsStr]);

  // Cálculo automático do aporte mensal necessário para atingir a meta considerando opções avançadas
  const goalResult = useMemo(() => {
    const goalAmount = parseCurrencyNumber(goalStr);
    const initialValue = parseCurrencyNumber(initialValueStr);
    const annualRate = parseRateNumber(annualRateStr);
    const years = parseRateNumber(yearsStr);
    const totalMonths = Math.round(years * 12);
    const monthlyRate = annualRate > 0 ? Math.pow(1 + annualRate / 100, 1 / 12) - 1 : 0;

    if (goalAmount <= 0) {
      return { reached: true, text: 'Meta já atingida' };
    }

    if (totalMonths <= 0) {
      return initialValue >= goalAmount
        ? { reached: true, text: 'Meta já atingida' }
        : { reached: false, text: formatCurrency(goalAmount - initialValue) };
    }

    // Processa os passos de mudança de aporte válidos
    const validSteps: { startMonth: number; newDeposit: number }[] = [];
    depositSteps.forEach(s => {
      const pVal = parseRateNumber(s.startValue);
      const dVal = parseCurrencyNumber(s.newDeposit);
      if (pVal > 0 && dVal > 0) {
        const sm = s.unit === 'year' ? Math.round((pVal - 1) * 12 + 1) : Math.round(pVal);
        if (sm >= 1 && sm <= totalMonths) {
          validSteps.push({ startMonth: sm, newDeposit: dVal });
        }
      }
    });

    // Processa os aportes únicos válidos
    const validLumpSums: { targetMonth: number; amount: number }[] = [];
    lumpSums.forEach(l => {
      const pVal = parseRateNumber(l.periodValue);
      const aVal = parseCurrencyNumber(l.amount);
      if (pVal > 0 && aVal > 0) {
        const tm = l.unit === 'year' ? Math.round((pVal - 1) * 12 + 1) : Math.round(pVal);
        if (tm >= 1 && tm <= totalMonths) {
          validLumpSums.push({ targetMonth: tm, amount: aVal });
        }
      }
    });

    // Valor futuro composto até totalMonths a partir do valor inicial e dos aportes fixados
    let fvFixed = initialValue * (monthlyRate > 0 ? Math.pow(1 + monthlyRate, totalMonths) : 1);
    let baseDepositFactor = 0;

    for (let m = 1; m <= totalMonths; m++) {
      const compoundFactor = monthlyRate > 0 ? Math.pow(1 + monthlyRate, totalMonths - m + 1) : 1;

      // Soma qualquer aporte único do mês m
      const lumpsInMonth = validLumpSums.filter(l => l.targetMonth === m);
      for (const lump of lumpsInMonth) {
        fvFixed += lump.amount * compoundFactor;
      }

      // Verifica se o mês m é coberto por uma mudança de aporte
      const activeSteps = validSteps.filter(s => s.startMonth <= m);
      if (activeSteps.length > 0) {
        activeSteps.sort((a, b) => a.startMonth - b.startMonth);
        const overriddenDeposit = activeSteps[activeSteps.length - 1].newDeposit;
        fvFixed += overriddenDeposit * compoundFactor;
      } else {
        // Mês sujeito ao aporte base a ser calculado
        baseDepositFactor += compoundFactor;
      }
    }

    if (fvFixed >= goalAmount) {
      return { reached: true, text: 'Meta já atingida' };
    }

    if (baseDepositFactor <= 0) {
      return { reached: false, text: 'Meta não atingida' };
    }

    const neededFromBaseDeposits = goalAmount - fvFixed;
    const pmt = neededFromBaseDeposits / baseDepositFactor;

    if (pmt <= 0) {
      return { reached: true, text: 'Meta já atingida' };
    }

    return {
      reached: false,
      text: `${formatCurrency(pmt)}/mês`,
    };
  }, [goalStr, initialValueStr, annualRateStr, yearsStr, depositSteps, lumpSums]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Barra superior minimalista */}
      <header className="h-14 border-b border-slate-200 bg-white/90 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 max-w-4xl w-full mx-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/40" />
          <h1 className="text-base font-semibold tracking-tight text-slate-900">
            Meu Investimento
          </h1>
        </div>
      </header>

      {/* Conteúdo principal - Página rola normalmente na vertical */}
      <main className="grow max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Card de Parâmetros - Sempre 2 colunas */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-6 shadow-xs">
          <h2 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4">
            Parâmetros do Investimento
          </h2>

          <div
            className="grid grid-cols-2 gap-2 sm:gap-3"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            {/* Linha 1: Valor inicial | Aporte mensal */}
            <div className="space-y-1 min-w-0">
              <label htmlFor="initial-value" className="block text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                Valor inicial
              </label>
              <div className="relative min-w-0 w-full">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                  R$
                </span>
                <input
                  id="initial-value"
                  type="text"
                  inputMode="decimal"
                  value={initialValueStr}
                  onChange={e => setInitialValueStr(formatThousandsInput(e.target.value))}
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-7 sm:pl-8 pr-2 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <label htmlFor="monthly-deposit" className="block text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                Aporte mensal
              </label>
              <div className="relative min-w-0 w-full">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                  R$
                </span>
                <input
                  id="monthly-deposit"
                  type="text"
                  inputMode="decimal"
                  value={monthlyDepositStr}
                  onChange={e => setMonthlyDepositStr(formatThousandsInput(e.target.value))}
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-7 sm:pl-8 pr-2 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                />
              </div>
            </div>

            {/* Linha 2: Taxa ao ano | Prazo em anos */}
            <div className="space-y-1 min-w-0">
              <label htmlFor="annual-rate" className="block text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                Taxa ao ano (%)
              </label>
              <div className="relative min-w-0 w-full">
                <input
                  id="annual-rate"
                  type="text"
                  inputMode="decimal"
                  value={annualRateStr}
                  onChange={e => setAnnualRateStr(sanitizeRateInput(e.target.value))}
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-2.5 pr-6 sm:pr-7 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <label htmlFor="years" className="block text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                Prazo em anos
              </label>
              <div className="relative min-w-0 w-full">
                <input
                  id="years"
                  type="text"
                  inputMode="numeric"
                  value={yearsStr}
                  onChange={e => setYearsStr(sanitizeRateInput(e.target.value))}
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-2.5 pr-10 sm:pr-12 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-slate-400 font-mono pointer-events-none">
                  {parseRateNumber(yearsStr) === 1 ? 'ano' : 'anos'}
                </span>
              </div>
            </div>

            {/* Linha 3: Inflação | Meta */}
            <div className="space-y-1 min-w-0">
              <label htmlFor="inflation-rate" className="block text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                Inflação ao ano (%)
              </label>
              <div className="relative min-w-0 w-full">
                <input
                  id="inflation-rate"
                  type="text"
                  inputMode="decimal"
                  value={inflationRateStr}
                  onChange={e => setInflationRateStr(sanitizeRateInput(e.target.value))}
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-2.5 pr-6 sm:pr-7 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <label htmlFor="goal" className="block text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                Meta (R$)
              </label>
              <div className="relative min-w-0 w-full">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                  R$
                </span>
                <input
                  id="goal"
                  type="text"
                  inputMode="decimal"
                  value={goalStr}
                  onChange={e => setGoalStr(formatThousandsInput(e.target.value))}
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-7 sm:pl-8 pr-2 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Botão para abrir/ocultar Opções Avançadas */}
          <div className="pt-3 border-t border-slate-100 mt-3.5">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(prev => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors py-1 cursor-pointer select-none"
            >
              <span>Opções avançadas</span>
              <span className="text-[11px]">{isAdvancedOpen ? '▴' : '▾'}</span>
              {(depositSteps.length > 0 || lumpSums.length > 0) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
              )}
            </button>
          </div>

          {/* Seção de Opções Avançadas sem scroll horizontal */}
          {isAdvancedOpen && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 p-2 space-y-3.5 overflow-x-hidden">
              {/* Bloco: Mudar meu aporte mensal */}
              <div className="space-y-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">
                    Mudar meu aporte mensal
                  </h3>
                  <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                    Use se você vai aumentar ou diminuir o aporte depois de um tempo.
                  </p>
                </div>

                {depositSteps.length > 0 && (
                  <div>
                    {depositSteps.map(step => (
                      <div
                        key={step.id}
                        className="border-b border-slate-100 last:border-b-0 pb-2 pt-1.5 space-y-1"
                      >
                        <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 text-[11px] sm:text-[13px] text-slate-600 font-medium">
                          <span className="whitespace-nowrap shrink-0">A partir do</span>
                          <select
                            value={step.unit}
                            onChange={e => handleUpdateStep(step.id, 'unit', e.target.value as PeriodUnit)}
                            className="w-[72px] min-w-[72px] h-[36px] bg-white border border-slate-200 rounded-lg px-1.5 text-[16px] text-slate-800 font-medium cursor-pointer focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shrink-0"
                            aria-label="Mês ou Ano"
                          >
                            <option value="year">Ano</option>
                            <option value="month">Mês</option>
                          </select>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={step.startValue}
                            onChange={e => handleUpdateStep(step.id, 'startValue', e.target.value)}
                            className="w-[56px] min-w-[56px] h-[36px] bg-white border border-slate-200 rounded-lg px-1 text-[16px] text-slate-900 font-mono text-center focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shrink-0"
                            aria-label="Número do período"
                          />
                          <span className="whitespace-nowrap shrink-0">, investir R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={step.newDeposit}
                            onChange={e => handleUpdateStep(step.id, 'newDeposit', e.target.value)}
                            className="flex-1 min-w-[65px] h-[36px] bg-white border border-slate-200 rounded-lg px-2 text-[16px] text-slate-900 font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                            aria-label="Novo valor do aporte mensal"
                          />
                          <span className="whitespace-nowrap shrink-0">por mês</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(step.id)}
                            className="w-6 h-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors font-bold text-xs cursor-pointer shrink-0"
                            title="Remover mudança"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Frase de confirmação em 12px cinza claro */}
                        {step.startValue && step.newDeposit && (
                          <div className="text-[12px] text-slate-400 font-normal pl-0.5">
                            Do {step.unit === 'year' ? `ano ${step.startValue}` : `mês ${step.startValue}`} em diante, o aporte será R$ {step.newDeposit} por mês
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddStep}
                  className="h-[32px] text-[13px] inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <span>+</span>
                  <span>Adicionar mudança</span>
                </button>
              </div>

              {/* Bloco: Aporte extra (uma vez só) */}
              <div className="space-y-2 pt-2.5 border-t border-slate-100">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">
                    Aporte extra (uma vez só)
                  </h3>
                  <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                    Use se você vai investir um valor grande em um mês específico.
                  </p>
                </div>

                {lumpSums.length > 0 && (
                  <div>
                    {lumpSums.map(lump => (
                      <div
                        key={lump.id}
                        className="border-b border-slate-100 last:border-b-0 pb-2 pt-1.5 space-y-1"
                      >
                        <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 text-[11px] sm:text-[13px] text-slate-600 font-medium">
                          <span className="whitespace-nowrap shrink-0">No</span>
                          <select
                            value={lump.unit}
                            onChange={e => handleUpdateLumpSum(lump.id, 'unit', e.target.value as PeriodUnit)}
                            className="w-[72px] min-w-[72px] h-[36px] bg-white border border-slate-200 rounded-lg px-1.5 text-[16px] text-slate-800 font-medium cursor-pointer focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shrink-0"
                            aria-label="Mês ou Ano"
                          >
                            <option value="year">Ano</option>
                            <option value="month">Mês</option>
                          </select>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={lump.periodValue}
                            onChange={e => handleUpdateLumpSum(lump.id, 'periodValue', e.target.value)}
                            className="w-[56px] min-w-[56px] h-[36px] bg-white border border-slate-200 rounded-lg px-1 text-[16px] text-slate-900 font-mono text-center focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shrink-0"
                            aria-label="Número do período"
                          />
                          <span className="whitespace-nowrap shrink-0">, investir R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={lump.amount}
                            onChange={e => handleUpdateLumpSum(lump.id, 'amount', e.target.value)}
                            className="flex-1 min-w-[65px] h-[36px] bg-white border border-slate-200 rounded-lg px-2 text-[16px] text-slate-900 font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                            aria-label="Valor do aporte extra"
                          />
                          <span className="whitespace-nowrap shrink-0">de uma vez</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLumpSum(lump.id)}
                            className="w-6 h-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors font-bold text-xs cursor-pointer shrink-0"
                            title="Remover aporte extra"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Frase de confirmação em 12px cinza claro */}
                        {lump.periodValue && lump.amount && (
                          <div className="text-[12px] text-slate-400 font-normal pl-0.5">
                            No {lump.unit === 'year' ? `ano ${lump.periodValue}` : `mês ${lump.periodValue}`}, entram R$ {lump.amount} a mais
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddLumpSum}
                  className="h-[32px] text-[13px] inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <span>+</span>
                  <span>Adicionar aporte extra</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Seção de Resultados - Sempre 2 colunas */}
        <section
          className="grid grid-cols-2 gap-2.5 sm:gap-3.5"
          style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          {/* Valor Final em destaque (Linha inteira: grid-column: 1 / -1) */}
          <div
            className="col-span-2 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-2.5"
            style={{ gridColumn: '1 / -1' }}
          >
            <span className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 font-semibold block">
              Valor Final
            </span>

            <div className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-emerald-600 tabular-nums tracking-tight">
              {formatCurrency(result.finalValue)}
            </div>

            {/* Juros no 1º mês e no último mês */}
            <div className="pt-2 border-t border-slate-100 space-y-1 text-xs font-mono tabular-nums">
              <div className="text-slate-600">
                <span>Juros no 1º mês: </span>
                <strong className="text-slate-800 font-semibold">
                  {formatCurrency(result.firstMonthInterest)}
                </strong>
              </div>
              <div className="text-slate-600">
                <span>Juros no último mês: </span>
                <strong className="text-emerald-600 font-semibold">
                  {formatCurrency(result.lastMonthInterest)}
                </strong>
              </div>
            </div>
          </div>

          {/* Par 1: Total investido | Juros ganhos */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
              Total Investido
            </span>
            <div className="text-sm sm:text-xl md:text-2xl font-bold font-mono text-slate-800 tabular-nums truncate">
              {formatCurrency(result.totalInvested)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              Capital desembolsado
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
              Juros Ganhos
            </span>
            <div className="text-sm sm:text-xl md:text-2xl font-bold font-mono text-emerald-600 tabular-nums truncate">
              +{formatCurrency(result.totalInterest)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              Rendimento acumulado
            </span>
          </div>

          {/* Par 2: Imposto (IR) | Valor líquido */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold truncate">
                Imposto (IR)
              </span>
              <span className="text-[9px] sm:text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-1 sm:px-2 py-0.5 rounded shrink-0">
                {irRatePercentText}
              </span>
            </div>
            <div className="text-sm sm:text-xl md:text-2xl font-bold font-mono text-slate-800 tabular-nums truncate">
              {irValue > 0 ? `-${formatCurrency(irValue)}` : formatCurrency(0)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              Tabela regressiva
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
              Valor Líquido
            </span>
            <div className="text-sm sm:text-xl md:text-2xl font-bold font-mono text-emerald-600 tabular-nums truncate">
              {formatCurrency(netValue)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              Após desconto do IR
            </span>
          </div>

          {/* Par 3: Em valores de hoje | Aporte p/ meta */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
              Em Valores de Hoje
            </span>
            <div className="text-sm sm:text-xl md:text-2xl font-bold font-mono text-slate-800 tabular-nums truncate">
              {formatCurrency(realNetValue)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              Descontada a inflação
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
              Aporte p/ Meta
            </span>
            <div
              className={`text-sm sm:text-xl md:text-2xl font-bold font-mono tabular-nums truncate ${
                goalResult.reached ? 'text-emerald-600 text-xs sm:text-base' : 'text-slate-800'
              }`}
            >
              {goalResult.text}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              Meta: {formatCurrency(parseCurrencyNumber(goalStr))}
            </span>
          </div>
        </section>

        {/* Card do Gráfico de Linha da Evolução (Linha inteira: grid-column: 1 / -1) */}
        <section
          className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-6 shadow-xs space-y-3"
          style={{ gridColumn: '1 / -1' }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Evolução do Patrimônio
          </h2>

          <CompoundChart data={result.monthlyData} />
        </section>
      </main>
    </div>
  );
}
