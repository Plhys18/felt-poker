export function formatChips(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatChipsPnL(amount: number): string {
  const abs = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(amount)));

  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `-${abs}`;
  return '0';
}
