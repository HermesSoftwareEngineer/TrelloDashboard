export const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

export const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;
