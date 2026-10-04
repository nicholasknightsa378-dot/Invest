/**
 * Formata um valor numérico para o padrão de moeda brasileiro (R$ 1.234,56)
 * Inclui separador de milhares com ponto (.) e decimais com vírgula (,)
 */
export function formatCurrency(value: number): string {
  if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata um valor com pontuação nos milhares para eixos de gráficos (ex: R$ 50.000, R$ 100.000)
 */
export function formatCompactCurrency(value: number): string {
  if (isNaN(value) || !isFinite(value) || value <= 0) return 'R$ 0';
  const rounded = Math.round(value);
  return `R$ ${rounded.toLocaleString('pt-BR')}`;
}

/**
 * Formata em tempo real o input de valor em moeda com pontuação de milhares
 * Ex: "1000" -> "1.000", "100000" -> "100.000", "1500,50" -> "1.500,50"
 */
export function formatThousandsInput(val: string): string {
  if (!val) return '';

  // Remove pontos existentes e caracteres não numéricos exceto vírgula
  const clean = val.replace(/\./g, '').replace(/[^0-9,]/g, '');
  if (!clean) return '';

  const parts = clean.split(',');
  const integerDigits = parts[0];

  if (!integerDigits && parts.length > 1) {
    const decimals = parts[1].slice(0, 2);
    return `0,${decimals}`;
  }

  const num = parseInt(integerDigits, 10);
  const formattedInteger = isNaN(num) ? '' : num.toLocaleString('pt-BR');

  if (parts.length > 1) {
    const decimals = parts[1].slice(0, 2);
    return `${formattedInteger},${decimals}`;
  }

  return formattedInteger;
}

/**
 * Converte string digitada com pontuação de milhares para número
 * Ex: "100.000" -> 100000, "1.500,50" -> 1500.5
 */
export function parseCurrencyNumber(val: string): number {
  if (!val) return 0;
  // Remove pontos de milhares
  const withoutDots = val.replace(/\./g, '').trim();
  // Converte vírgula para ponto decimal
  const normalized = withoutDots.replace(',', '.');
  const num = parseFloat(normalized);
  if (isNaN(num) || !isFinite(num) || num < 0) return 0;
  return num;
}
