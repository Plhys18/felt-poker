import { cn } from '../../lib/cn';
import { formatChips, formatChipsPnL } from '../../engine/currency';

interface CurrencyDisplayProps {
  amount: number;
  showSign?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CurrencyDisplay({
  amount,
  showSign = false,
  className,
  size = 'md',
}: CurrencyDisplayProps) {
  const colorClass =
    amount > 0 ? 'text-profit' : amount < 0 ? 'text-loss' : 'text-white';

  const sizeClass: Record<string, string> = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-2xl font-black',
  };

  const formatted = showSign
    ? formatChipsPnL(amount)
    : formatChips(Math.abs(amount));

  return (
    <span className={cn(colorClass, sizeClass[size], className)}>
      {formatted}
    </span>
  );
}
