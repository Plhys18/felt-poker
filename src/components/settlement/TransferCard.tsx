import type { Transfer } from '../../types/settlement';
import type { PlayerId } from '../../types/ids';
import { formatChips } from '../../engine/currency';
import { ArrowRight, CheckIcon } from '../ui/icons';
import { cn } from '../../lib/cn';

interface TransferCardProps {
  transfer: Transfer;
  playerNames: Record<PlayerId, string>;
  isPaid: boolean;
  onToggle: () => void;
}

export function TransferCard({ transfer, playerNames, isPaid, onToggle }: TransferCardProps) {
  const fromName = playerNames[transfer.from] ?? 'Unknown';
  const toName = playerNames[transfer.to] ?? 'Unknown';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full text-left bg-white/[0.07] rounded-xl border px-4 py-3 flex items-center gap-3 shadow-md shadow-black/20 transition-all duration-200 cursor-pointer hover:bg-white/[0.10] active:scale-[0.99]',
        isPaid
          ? 'border-profit/40 opacity-60'
          : 'border-white/10',
      )}
    >
      {/* Paid indicator circle */}
      <div className="flex-shrink-0">
        {isPaid ? (
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-profit/20 border border-profit/60">
            <CheckIcon size={13} className="text-profit" />
          </span>
        ) : (
          <span className="flex items-center justify-center w-6 h-6 rounded-full border border-white/20" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className={cn('text-loss font-bold truncate', isPaid && 'line-through decoration-loss/50')}>
          {fromName}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <ArrowRight size={16} className="text-white/40" />
        <span className="text-gold font-black text-base tabular-nums drop-shadow-[0_0_6px_rgba(201,168,76,0.3)]">
          {formatChips(transfer.amount)} chips
        </span>
        <ArrowRight size={16} className="text-white/40" />
      </div>

      <div className="flex-1 min-w-0 text-right">
        <span className={cn('text-profit font-bold truncate', isPaid && 'line-through decoration-profit/50')}>
          {toName}
        </span>
      </div>
    </button>
  );
}
