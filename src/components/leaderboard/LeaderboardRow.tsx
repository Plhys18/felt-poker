import { memo } from 'react';
import type { PlayerState } from '../../types/projection';
import { cn } from '../../lib/cn';
import { formatChips } from '../../engine/currency';
import { Crown } from '../ui/icons';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

interface LeaderboardRowProps {
  player: PlayerState;
  rank: number;
}

export const LeaderboardRow = memo(function LeaderboardRow({ player, rank }: LeaderboardRowProps) {
  const isFirst = rank === 1;
  const isCashedOut = player.status === 'cashed_out';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors',
        isFirst && 'bg-gradient-to-r from-gold/10 to-transparent',
        isCashedOut && 'opacity-50',
      )}
    >
      {/* Rank */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        {isFirst ? (
          <Crown size={20} className="text-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.6)]" />
        ) : (
          <span
            className={cn(
              'text-sm font-bold tabular-nums',
              rank <= 3 ? 'text-white/70' : 'text-white/30',
            )}
          >
            {rank}
          </span>
        )}
      </div>

      {/* Player name */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-bold truncate',
            isFirst ? 'text-gold' : 'text-white',
          )}
        >
          {player.name}
        </p>
        {isCashedOut && (
          <p className="text-white/30 text-xs">Cashed out</p>
        )}
      </div>

      {/* In */}
      <div className="text-right w-16 flex-shrink-0">
        <p className="text-white/40 text-xs">In</p>
        <p className="text-white/70 text-sm font-semibold tabular-nums">
          {formatChips(player.totalBuyIn)}
        </p>
      </div>

      {/* Stack — hidden on mobile to give name room */}
      <div className="hidden sm:block text-right w-16 flex-shrink-0">
        <p className="text-white/40 text-xs">Stack</p>
        <p className="text-white/70 text-sm font-semibold tabular-nums">
          {formatChips(player.currentStack)}
        </p>
      </div>

      {/* Net P&L */}
      <div className="text-right w-20 flex-shrink-0">
        <p className="text-white/40 text-xs">Net</p>
        <CurrencyDisplay amount={player.netProfitLoss} showSign size="sm" />
      </div>
    </div>
  );
});
