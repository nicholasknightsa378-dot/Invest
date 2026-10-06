import { useState, useMemo, useEffect } from 'react';
import {
  InvestmentItem,
  InvestmentType,
} from '../types/portfolio';
import {
  calculatePortfolioSummary,
  calculateInvestment,
  INVESTMENT_TYPE_COLORS,
  ALL_INVESTMENT_TYPES,
} from '../utils/portfolioCalculations';
import {
  formatCurrency,
  formatThousandsInput,
} from '../utils/formatters';
import DonutChart from './DonutChart';

const STORAGE_KEY_PORTFOLIO = 'carteira_investimentos_v1';

function sanitizeRateInput(val: string): string {
  return val.replace(/-/g, '').replace(/[^0-9.,]/g, '');
}

function getTodayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function PortfolioTab() {
  // Carrega investimentos do localStorage
  const [investments, setInvestments] = useState<InvestmentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PORTFOLIO);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignora erro
    }
    return [];
  });

  // Salva automaticamente no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(investments));
    } catch {
      // Ignora erro
    }
  }, [investments]);

  // Modais de Criação e Edição
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvestmentItem | null>(null);

  // Confirmação de exclusão
  const [itemToDelete, setItemToDelete] = useState<InvestmentItem | null>(null);

  // IDs dos cards expandidos (recolhidos por padrão)
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(() => new Set());

  // Estados do formulário de Novo Investimento
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<InvestmentType>('Renda fixa');
  const [formRate, setFormRate] = useState('');
  const [formInitialAmount, setFormInitialAmount] = useState('');
  const [formInitialDate, setFormInitialDate] = useState(getTodayIso());

  // Modal para adicionar aporte
  const [targetInvestmentForAporte, setTargetInvestmentForAporte] = useState<string | null>(null);
  const [aporteDate, setAporteDate] = useState(getTodayIso());
  const [aporteAmount, setAporteAmount] = useState('');

  // Resumo consolidado da carteira
  const summary = useMemo(() => {
    return calculatePortfolioSummary(investments);
  }, [investments]);

  // Cálculos individuais dos investimentos
  const calculatedItems = useMemo(() => {
    return investments.map(inv => calculateInvestment(inv));
  }, [investments]);

  const handleOpenNewModal = () => {
    setFormName('');
    setFormType('Renda fixa');
    setFormRate('');
    setFormInitialAmount('');
    setFormInitialDate(getTodayIso());
    setIsNewModalOpen(true);
  };

  const handleCreateInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) return;

    const newId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: InvestmentItem = {
      id: newId,
      name: cleanName,
      type: formType,
      annualRate: sanitizeRateInput(formRate),
      aportes: [
        {
          id: `apt-${Date.now()}`,
          date: formInitialDate || getTodayIso(),
          amount: formatThousandsInput(formInitialAmount),
        },
      ],
    };

    setInvestments(prev => [newItem, ...prev]);
    // Novo investimento já abre expandido
    setExpandedCardIds(prev => new Set(prev).add(newId));
    setIsNewModalOpen(false);
  };

  const toggleCardExpand = (id: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenEditModal = (item: InvestmentItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormType(item.type);
    setFormRate(item.annualRate);
  };

  const handleSaveEditInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const cleanName = formName.trim();
    if (!cleanName) return;

    setInvestments(prev =>
      prev.map(inv => {
        if (inv.id !== editingItem.id) return inv;
        return {
          ...inv,
          name: cleanName,
          type: formType,
          annualRate: sanitizeRateInput(formRate),
        };
      })
    );
    setEditingItem(null);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    setInvestments(prev => prev.filter(inv => inv.id !== itemToDelete.id));
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      next.delete(itemToDelete.id);
      return next;
    });
    setItemToDelete(null);
  };

  const handleUpdateManualCurrentValue = (investmentId: string, val: string) => {
    setInvestments(prev =>
      prev.map(inv => {
        if (inv.id !== investmentId) return inv;
        return {
          ...inv,
          manualCurrentValue: formatThousandsInput(val),
        };
      })
    );
  };

  const handleOpenAddAporte = (investmentId: string) => {
    setTargetInvestmentForAporte(investmentId);
    setAporteDate(getTodayIso());
    setAporteAmount('');
  };

  const handleSaveAporte = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInvestmentForAporte) return;

    const newAporte = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: aporteDate || getTodayIso(),
      amount: formatThousandsInput(aporteAmount),
    };

    setInvestments(prev =>
      prev.map(inv => {
        if (inv.id !== targetInvestmentForAporte) return inv;
        return {
          ...inv,
          aportes: [...inv.aportes, newAporte],
        };
      })
    );

    setTargetInvestmentForAporte(null);
  };

  const handleRemoveAporte = (investmentId: string, aporteId: string) => {
    setInvestments(prev =>
      prev.map(inv => {
        if (inv.id !== investmentId) return inv;
        return {
          ...inv,
          aportes: inv.aportes.filter(a => a.id !== aporteId),
        };
      })
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 3. Resumo no topo da aba (cards em 2 colunas) */}
      <section
        className="grid grid-cols-2 gap-2.5 sm:gap-3.5"
        style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        {/* Par 1: Total aportado | Valor atual */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
            Total Aportado
          </span>
          <div className="text-base sm:text-2xl font-bold font-mono text-slate-900 tabular-nums truncate">
            {formatCurrency(summary.totalInvested)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            Soma de todos aportes
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
            Valor Atual
          </span>
          <div className="text-base sm:text-2xl font-bold font-mono text-emerald-600 tabular-nums truncate">
            {formatCurrency(summary.currentValue)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            Com juros acumulados
          </span>
        </div>

        {/* Par 2: Rendimento total (R$) | Rendimento (%) */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
            Rendimento Total (R$)
          </span>
          <div
            className={`text-base sm:text-2xl font-bold font-mono tabular-nums truncate ${
              summary.totalReturnAmount < 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {summary.totalReturnAmount >= 0
              ? `+${formatCurrency(summary.totalReturnAmount)}`
              : formatCurrency(summary.totalReturnAmount)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            {summary.totalReturnAmount < 0 ? 'Prejuízo até hoje' : 'Lucro até hoje'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col justify-between min-w-0">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5 truncate">
            Rendimento (%)
          </span>
          <div
            className={`text-base sm:text-2xl font-bold font-mono tabular-nums truncate ${
              summary.totalReturnPercentage < 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {summary.totalReturnPercentage >= 0
              ? `+${summary.totalReturnPercentage.toFixed(2)}%`
              : `${summary.totalReturnPercentage.toFixed(2)}%`}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            Retorno ponderado
          </span>
        </div>
      </section>

      {/* 4. Diversificação por Tipo (Donut Chart) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Diversificação
          </h2>
          <p className="text-[12px] text-slate-400 font-normal">
            Mostra como seu dinheiro está dividido.
          </p>
        </div>

        <DonutChart slices={summary.byType} totalValue={summary.currentValue} />
      </section>

      {/* 1. Lista de Investimentos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Meus Investimentos ({investments.length})
          </h2>

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="h-8 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>Novo investimento</span>
          </button>
        </div>

        {/* Estado vazio amigável */}
        {investments.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
              💰
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                Nenhum investimento ainda.
              </p>
              <p className="text-xs text-slate-400">
                Toque em + Novo investimento para começar a acompanhar seu dinheiro.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="h-9 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Novo investimento</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {calculatedItems.map((item, index) => {
              const rawItem = investments[index];
              const isExpanded = expandedCardIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all duration-200"
                >
                  {/* CARD RECOLHIDO: uma linha compacta clicável */}
                  <div
                    onClick={() => toggleCardExpand(item.id)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Esquerda: Nome + etiqueta do tipo (pequena) */}
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {item.name}
                      </h3>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                        style={{
                          backgroundColor: INVESTMENT_TYPE_COLORS[item.type] || '#64748b',
                        }}
                      >
                        {item.type}
                      </span>
                    </div>

                    {/* Direita: Valor atual em destaque, rendimento e etiqueta Estimado / Valor informado por mim */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right font-mono tabular-nums">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                            {formatCurrency(item.currentValue)}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                              item.isManualValue
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.isManualValue ? 'Valor informado por mim' : 'Estimado'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] sm:text-[11px] font-semibold block leading-tight mt-0.5 ${
                            item.returnAmount < 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {item.returnAmount >= 0
                            ? `+${formatCurrency(item.returnAmount)}`
                            : formatCurrency(item.returnAmount)}{' '}
                          ({item.returnPercentage >= 0
                            ? `+${item.returnPercentage.toFixed(2)}%`
                            : `${item.returnPercentage.toFixed(2)}%`})
                        </span>
                      </div>

                      <span className="text-slate-400 font-bold text-xs w-4 text-center shrink-0">
                        {isExpanded ? '▴' : '▾'}
                      </span>
                    </div>
                  </div>

                  {/* CARD EXPANDIDO (ao tocar): Mostra o que existe hoje */}
                  {isExpanded && (
                    <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 pt-0 space-y-3.5 border-t border-slate-100 transition-all duration-200 animate-in fade-in">
                      {/* Subcabeçalho com Rendimento ao ano e Ações (Editar / Excluir) */}
                      <div className="flex items-center justify-between gap-2 pt-3">
                        <div className="text-[11px] text-slate-400 font-mono">
                          Rendimento: {rawItem.annualRate ? `${rawItem.annualRate}% a.a.` : '0% a.a.'}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEditModal(rawItem);
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            title="Editar investimento"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setItemToDelete(rawItem);
                            }}
                            className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors cursor-pointer font-bold"
                            title="Excluir investimento"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Campo opcional: Valor atual real (R$) */}
                      <div className="space-y-1 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between gap-1">
                          <label className="block text-[11px] sm:text-xs font-medium text-slate-700">
                            Valor atual real (R$)
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Opcional
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                            R$
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            value={rawItem.manualCurrentValue || ''}
                            onChange={e => handleUpdateManualCurrentValue(rawItem.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full bg-white border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-1.5 pl-7 pr-2 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                          />
                        </div>
                      </div>

                      {/* Métricas do Card (Total aportado, Valor atual, Rendimento) */}
                      <div
                        className="grid grid-cols-2 gap-2 text-xs"
                        style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
                      >
                        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">
                            Total aportado
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm block truncate tabular-nums mt-0.5">
                            {formatCurrency(item.totalInvested)}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">
                              Valor atual
                            </span>
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                                item.isManualValue
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                  : 'bg-slate-200/70 text-slate-600'
                              }`}
                            >
                              {item.isManualValue ? 'Valor informado por mim' : 'Estimado'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-sm block truncate tabular-nums mt-0.5">
                            {formatCurrency(item.currentValue)}
                          </span>
                        </div>

                        <div
                          className={`col-span-2 p-2.5 rounded-xl min-w-0 flex items-center justify-between ${
                            item.returnAmount < 0
                              ? 'bg-red-50/60 border border-red-200/60'
                              : 'bg-emerald-50/50 border border-emerald-100/60'
                          }`}
                        >
                          <span
                            className={`text-[11px] font-medium ${
                              item.returnAmount < 0 ? 'text-red-800' : 'text-emerald-800'
                            }`}
                          >
                            Rendimento:
                          </span>
                          <div
                            className={`text-right font-mono font-bold text-xs tabular-nums ${
                              item.returnAmount < 0 ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {item.returnAmount >= 0
                              ? `+${formatCurrency(item.returnAmount)}`
                              : formatCurrency(item.returnAmount)}{' '}
                            <span
                              className={`text-[11px] font-semibold ${
                                item.returnAmount < 0 ? 'text-red-500' : 'text-emerald-600'
                              }`}
                            >
                              ({item.returnPercentage >= 0
                                ? `+${item.returnPercentage.toFixed(2)}%`
                                : `${item.returnPercentage.toFixed(2)}%`})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Aportes do Investimento */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                            Aportes ({item.aportes.length})
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenAddAporte(rawItem.id);
                            }}
                            className="h-6 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>Aporte</span>
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                          {item.aportes.map((ap, apIdx) => (
                            <div
                              key={ap.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-semibold text-slate-400 font-mono shrink-0">
                                  {apIdx === 0 ? 'Inicial' : `#${apIdx + 1}`}
                                </span>
                                <span className="text-slate-600 font-mono text-[11px] shrink-0">
                                  {formatDateBR(ap.date)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right font-mono tabular-nums">
                                  <span className="text-slate-900 font-semibold block text-[11px]">
                                    {formatCurrency(ap.amount)}
                                  </span>
                                  {ap.currentValue > ap.amount && (
                                    <span className="text-[10px] text-emerald-600 block">
                                      atual: {formatCurrency(ap.currentValue)}
                                    </span>
                                  )}
                                </div>

                                {/* Botão x para remover aporte */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRemoveAporte(rawItem.id, ap.id);
                                  }}
                                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-600 rounded transition-colors text-xs font-bold cursor-pointer"
                                  title="Remover aporte"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Aviso pequeno no rodapé da aba */}
      <footer className="text-center pt-2 pb-4">
        <p className="text-[11px] text-slate-400">
          Valores estimados com base na taxa informada. Não substitui o extrato do banco.
        </p>
      </footer>

      {/* MODAL: Novo Investimento */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Novo Investimento
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvestment} className="space-y-3">
              {/* Nome */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Nome do investimento
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-[16px] text-slate-900 transition-colors"
                />
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Tipo
                </label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as InvestmentType)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-[16px] text-slate-900 transition-colors cursor-pointer"
                >
                  {ALL_INVESTMENT_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rendimento ao ano (%) */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Rendimento ao ano (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={formRate}
                    onChange={e => setFormRate(sanitizeRateInput(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-3 pr-7 text-[16px] text-slate-900 font-mono transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Aporte Inicial: Data e Valor em 2 colunas */}
              <div
                className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100"
                style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
              >
                <div className="space-y-1 min-w-0">
                  <label className="block text-[11px] font-medium text-slate-700 truncate">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    required
                    value={formInitialDate}
                    onChange={e => setFormInitialDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-2 text-[16px] text-slate-900 font-mono transition-colors"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="block text-[11px] font-medium text-slate-700 truncate">
                    Valor inicial (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={formInitialAmount}
                      onChange={e => setFormInitialAmount(formatThousandsInput(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-7 pr-2 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Investimento */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Editar Investimento
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditInvestment} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Nome do investimento
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-[16px] text-slate-900 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Tipo
                </label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as InvestmentType)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-[16px] text-slate-900 transition-colors cursor-pointer"
                >
                  {ALL_INVESTMENT_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Rendimento ao ano (%)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={formRate}
                    onChange={e => setFormRate(sanitizeRateInput(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-3 pr-7 text-[16px] text-slate-900 font-mono transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar Novo Aporte */}
      {targetInvestmentForAporte && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Adicionar Aporte
              </h3>
              <button
                type="button"
                onClick={() => setTargetInvestmentForAporte(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAporte} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Data do aporte
                </label>
                <input
                  type="date"
                  required
                  value={aporteDate}
                  onChange={e => setAporteDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-[16px] text-slate-900 font-mono transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Valor (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 font-mono pointer-events-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    required
                    value={aporteAmount}
                    onChange={e => setAporteAmount(formatThousandsInput(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 pl-7 pr-2 text-[16px] text-slate-900 font-mono tabular-nums transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetInvestmentForAporte(null)}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmação de Exclusão de Investimento */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl border border-slate-200 space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Excluir investimento?
              </h3>
              <p className="text-xs text-slate-500">
                "{itemToDelete.name}" e todos os seus aportes serão removidos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
