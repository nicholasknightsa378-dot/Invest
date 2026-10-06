import { formatCurrency } from '../utils/formatters';
import { InvestmentType } from '../types/portfolio';

interface DonutSlice {
  type: InvestmentType;
  currentValue: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  totalValue: number;
}

export default function DonutChart({ slices, totalValue }: DonutChartProps) {
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Filtra apenas tipos que têm valor > 0
  const activeSlices = slices.filter(s => s.currentValue > 0);

  // Calcula os offsets para cada fatia
  let accumulatedPercent = 0;
  const renderSlices = activeSlices.map(slice => {
    const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += slice.percentage;

    return {
      ...slice,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      {/* Gráfico Donut em SVG */}
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Círculo de fundo cinza */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Fatias coloridas */}
          {totalValue > 0 ? (
            renderSlices.map(slice => (
              <circle
                key={slice.type}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            ))
          ) : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {/* Centro do Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Total
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 truncate max-w-[120px]">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>

      {/* Legenda em 2 colunas abaixo com porcentagem */}
      <div
        className="grid grid-cols-2 gap-2 w-full pt-1"
        style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        {slices.map(slice => (
          <div
            key={slice.type}
            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-xs min-w-0"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate pr-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-slate-700 font-medium truncate">
                {slice.type}
              </span>
            </div>
            <span className="font-mono font-semibold text-slate-900 shrink-0 tabular-nums">
              {slice.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
