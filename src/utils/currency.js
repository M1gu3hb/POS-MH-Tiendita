export const formatMoney = (amount, symbol = '$') => {
  if (amount === null || amount === undefined) return `${symbol}0.00`;
  const num = Number(amount);
  if (isNaN(num)) return `${symbol}0.00`;
  return `${symbol}${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatPercent = (value) => {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

export const calcUtilidad = (precio, costo) => {
  return (precio || 0) - (costo || 0);
};

export const calcMargen = (precio, costo) => {
  if (!precio || precio === 0) return 0;
  return ((precio - (costo || 0)) / precio) * 100;
};