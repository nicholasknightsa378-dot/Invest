import { useState, useRef, useId } from 'react';
import { MonthDataPoint } from '../types/investment';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';

interface CompoundChartProps {
  data: MonthDataPoint[];
}

export default function CompoundChart({ data }: CompoundChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        Nenhum dado para exibir.
      </div>
    );
  }

  // Dimensões do canvas SVG
  const width = 800;
  const height = 340;
  // paddingLeft com folga suficiente para valores em R$ com pontuação de milhares sem cortar rótulos
  const paddingLeft = 88;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 44;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxAccumulated = data[data.length - 1]?.totalAccumulated || 1;
  const maxY = Math.max(maxAccumulated * 1.06, 100);

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    const clamped = Math.max(0, value);
    return paddingTop + chartHeight - (clamped / maxY) * chartHeight;
  };

  const pointsAccumulated = data
    .map((d, i) => `${getX(i).toFixed(1)},${getY(d.totalAccumulated).toFixed(1)}`)
    .join(' ');
  const pointsInvested = data
    .map((d, i) => `${getX(i).toFixed(1)},${getY(d.totalInvested).toFixed(1)}`)
    .join(' ');

  const areaPath = `
    M ${getX(0).toFixed(1)},${getY(0).toFixed(1)}
    L ${data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.totalAccumulated).toFixed(1)}`).join(' L ')}
    L ${getX(data.length - 1).toFixed(1)},${getY(0).toFixed(1)}
    Z
  `;

  // 4 ticks horizontais de referência
  const yTicks = [0, 0.33, 0.66, 1].map(ratio => ratio * maxY);

  // Seleção inteligente de ticks no Eixo X por Ano
  const totalMonths = data.length - 1;
  const totalYears = Math.ceil(totalMonths / 12);
  const xIndices: number[] = [0];

  if (totalYears <= 5) {
    // Para até 5 anos, marca ano a ano
    for (let m = 12; m <= totalMonths; m += 12) {
      xIndices.push(m);
    }
  } else if (totalYears <= 15) {
    // Para até 15 anos, marca a cada 2 ou 3 anos
    const stepYears = totalYears > 10 ? 3 : 2;
    for (let y = stepYears; y <= totalYears; y += stepYears) {
      const m = Math.min(y * 12, totalMonths);
      if (!xIndices.includes(m)) xIndices.push(m);
    }
  } else {
    // Para mais de 15 anos, marca a cada 5 anos
    for (let y = 5; y <= totalYears; y += 5) {
      const m = Math.min(y * 12, totalMonths);
      if (!xIndices.includes(m)) xIndices.push(m);
    }
  }
  // Garante que o último mês está presente
  if (!xIndices.includes(totalMonths) && totalMonths > 0) {
    xIndices.push(totalMonths);
  }

  const updateIndexFromClientX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const svgX = (relativeX / rect.width) * width;

    if (svgX < paddingLeft || svgX > width - paddingRight) {
      return;
    }

    const ratio = (svgX - paddingLeft) / chartWidth;
    const targetIdx = Math.round(ratio * (data.length - 1));
    const clampedIdx = Math.max(0, Math.min(data.length - 1, targetIdx));
    setHoverIndex(clampedIdx);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    updateIndexFromClientX(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) {
      updateIndexFromClientX(e.touches[0].clientX);
    }
  };

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;
  const activeX = hoverIndex !== null ? getX(hoverIndex) : 0;
  const activeYAccumulated = activePoint ? getY(activePoint.totalAccumulated) : 0;

  // Posição horizontal segura para o tooltip não cortar nas bordas
  const tooltipLeftPercent = Math.max(14, Math.min(86, (activeX / width) * 100));

  return (
    <div className="flex flex-col w-full space-y-3">
      {/* Legenda simples e indicador de toque */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block shadow-xs" />
            <span className="text-slate-700 font-medium">Total com juros</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-400 inline-block" />
            <span className="text-slate-500">Total investido</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          {activePoint
            ? activePoint.month === 0
              ? 'Início (Mês 0)'
              : `Ano ${activePoint.year} (Mês ${activePoint.month})`
            : 'Toque ou passe o mouse no gráfico'}
        </span>
      </div>

      {/* Container SVG responsivo - Totalmente visível sem corte */}
      <div
        ref={containerRef}
        className="relative w-full aspect-16/9 sm:aspect-21/9 select-none min-h-[220px]"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair touch-none overflow-visible"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchMove}
        >
          <defs>
            <linearGradient id={`grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
              <stop offset="85%" stopColor="#059669" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Linhas de Grade e Eixo Y legível e sem corte */}
          {yTicks.map((tick, idx) => {
            const y = getY(tick);
            return (
              <g key={`ytick-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="2 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="end"
                >
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            );
          })}

          {/* Área gradiente sob o saldo com juros */}
          <path d={areaPath} fill={`url(#grad-${gradientId})`} />

          {/* Linha do Total Investido (tracejada) */}
          <polyline
            points={pointsInvested}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.75"
            strokeDasharray="4 3"
          />

          {/* Linha do Total Acumulado com Juros (Verde sólida) */}
          <polyline
            points={pointsAccumulated}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Rótulos do Eixo X (Ano 0, Ano 1, etc.) */}
          {xIndices.map(idx => {
            const pt = data[idx];
            if (!pt) return null;
            const x = getX(idx);
            let label = `Mês ${pt.month}`;
            if (pt.month === 0) label = 'Início';
            else if (pt.month % 12 === 0) label = `${pt.month / 12}º ano`;
            else label = `Mês ${pt.month}`;

            return (
              <g key={`xtick-${idx}`}>
                <line
                  x1={x}
                  y1={height - paddingBottom}
                  x2={x}
                  y2={height - paddingBottom + 4}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - paddingBottom + 18}
                  fill="#64748b"
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Scrubber vertical ativo ao passar o mouse ou tocar */}
          {hoverIndex !== null && activePoint && (
            <g>
              <line
                x1={activeX}
                y1={paddingTop}
                x2={activeX}
                y2={height - paddingBottom}
                stroke="#059669"
                strokeWidth="1.25"
                strokeDasharray="3 3"
              />
              <circle
                cx={activeX}
                cy={activeYAccumulated}
                r="5"
                fill="#059669"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Tooltip com ano, mês e valores detalhados ao tocar ou passar mouse */}
        {hoverIndex !== null && activePoint && (
          <div
            className="pointer-events-none absolute z-20 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white shadow-xl font-mono tabular-nums whitespace-nowrap transition-all duration-75"
            style={{
              left: `${tooltipLeftPercent}%`,
              top: `${Math.max(4, Math.min(75, (activeYAccumulated / height) * 100 - 15))}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold text-slate-200 border-b border-slate-700/80 pb-1 mb-1.5 flex items-center justify-between gap-3 text-[11px]">
              <span>
                {activePoint.month === 0
                  ? 'Ponto de Partida'
                  : `Ano ${activePoint.year} · Mês ${activePoint.month}`}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Total acumulado:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(activePoint.totalAccumulated)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Total investido:</span>
                <span className="text-slate-300">{formatCurrency(activePoint.totalInvested)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Juros totais:</span>
                <span className="text-emerald-300">+{formatCurrency(activePoint.totalInterest)}</span>
              </div>
              {activePoint.interestThisMonth > 0 && (
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>Rendimento do mês:</span>
                  <span className="text-emerald-400 font-semibold">+{formatCurrency(activePoint.interestThisMonth)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
