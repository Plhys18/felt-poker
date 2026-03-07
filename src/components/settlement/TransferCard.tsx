import type { Transfer } from '../../types/settlement';
import type { PlayerId } from '../../types/ids';
import { formatChips } from '../../engine/currency';
import { ArrowRight } from '../ui/icons';

interface TransferCardProps {
  transfer: Transfer;
  playerNames: Record<PlayerId, string>;
}

export function TransferCard({ transfer, playerNames }: TransferCardProps) {
  const fromName = playerNames[transfer.from] ?? 'Unknown';
  const toName = playerNames[transfer.to] ?? 'Unknown';

  return (
    <div className="bg-white/[0.07] rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3 shadow-md shadow-black/20">
      <div className="flex-1 min-w-0">
        <span className="text-loss font-bold truncate">{fromName}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <ArrowRight size={16} className="text-white/40" />
        <span className="text-gold font-black text-base tabular-nums drop-shadow-[0_0_6px_rgba(201,168,76,0.3)]">
          {formatChips(transfer.amount)} chips
        </span>
        <ArrowRight size={16} className="text-white/40" />
      </div>

      <div className="flex-1 min-w-0 text-right">
        <span className="text-profit font-bold truncate">{toName}</span>
      </div>
    </div>
  );
}
