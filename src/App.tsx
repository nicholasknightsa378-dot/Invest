import { useState, useMemo, useEffect } from 'react';
import { calculateCompoundInterest } from './utils/calculations';
import {
  formatCurrency,
  formatThousandsInput,
  parseCurrencyNumber,
} from './utils/formatters';
import CompoundChart from './components/CompoundChart';

const STORAGE_KEY = 'meu_investimento_params_v3';

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
        })
      );
    } catch {
      // Ignora erro
    }
  }, [initialValueStr, monthlyDepositStr, annualRateStr, yearsStr, inflationRateStr, goalStr]);

  // Cálculos reativos protegidos contra NaN e negativos
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
    });
  }, [initialValueStr, monthlyDepositStr, annualRateStr, yearsStr]);

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

  // Cálculo automático do aporte mensal necessário para atingir a meta
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

    // Valor futuro acumulado exclusivamente a partir do valor inicial
    const futureInitial = initialValue * (monthlyRate > 0 ? Math.pow(1 + monthlyRate, totalMonths) : 1);

    if (futureInitial >= goalAmount) {
      return { reached: true, text: 'Meta já atingida' };
    }

    const neededFromDeposits = goalAmount - futureInitial;

    if (totalMonths <= 0) {
      return { reached: false, text: formatCurrency(neededFromDeposits) };
    }

    let pmt = 0;
    if (monthlyRate === 0) {
      pmt = neededFromDeposits / totalMonths;
    } else {
      // Aportes no início do mês: FV = PMT * ((1+i)^n - 1)/i * (1+i)
      const factor = ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
      pmt = factor > 0 ? neededFromDeposits / factor : 0;
    }

    return {
      reached: false,
      text: `${formatCurrency(pmt)}/mês`,
    };
  }, [goalStr, initialValueStr, annualRateStr, yearsStr]);

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
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                  R$
                </span>
                <input
                  id="initial-value"
                  type="text"
                  inputMode="decimal"
                  value={initialValueStr}
                  onChange={e => setInitialValueStr(formatThousandsInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-7 sm:pl-8 pr-2 text-xs sm:text-sm text-slate-900 font-mono tabular-nums transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <label htmlFor="monthly-deposit" className="block text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                Aporte mensal
              </label>
              <div className="relative min-w-0 w-full">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                  R$
                </span>
                <input
                  id="monthly-deposit"
                  type="text"
                  inputMode="decimal"
                  value={monthlyDepositStr}
                  onChange={e => setMonthlyDepositStr(formatThousandsInput(e.target.value))}
                  placeholder="0,00"
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-7 sm:pl-8 pr-2 text-xs sm:text-sm text-slate-900 font-mono tabular-nums transition-colors"
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
                  placeholder="0,0"
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-2.5 pr-6 sm:pr-7 text-xs sm:text-sm text-slate-900 font-mono tabular-nums transition-colors"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-semibold text-slate-400 pointer-events-none">
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
                  placeholder="1"
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-2.5 pr-10 sm:pr-12 text-xs sm:text-sm text-slate-900 font-mono tabular-nums transition-colors"
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
                  placeholder="4"
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-2.5 pr-6 sm:pr-7 text-xs sm:text-sm text-slate-900 font-mono tabular-nums transition-colors"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-semibold text-slate-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <label htmlFor="goal" className="block text-[11px] sm:text-xs font-medium text-slate-700 truncate">
                Meta (R$)
              </label>
              <div className="relative min-w-0 w-full">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                  R$
                </span>
                <input
                  id="goal"
                  type="text"
                  inputMode="decimal"
                  value={goalStr}
                  onChange={e => setGoalStr(formatThousandsInput(e.target.value))}
                  placeholder="100.000"
                  className="w-full min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-7 sm:pl-8 pr-2 text-xs sm:text-sm text-slate-900 font-mono tabular-nums transition-colors"
                />
              </div>
            </div>
          </div>
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
