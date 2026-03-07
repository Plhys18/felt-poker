import { memo, useState } from 'react';
import type { PlayerId } from '../../types/ids';
import { usePlayer } from '../../hooks/use-player';
import { usePlayerActions } from '../../hooks/use-player-actions';
import { cn } from '../../lib/cn';
import { formatChips } from '../../engine/currency';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { StackEditor } from './StackEditor';
import { RebuyDialog } from './RebuyDialog';

interface PlayerCardProps {
  playerId: PlayerId;
  defaultBuyIn: number;
}

export const PlayerCard = memo(function PlayerCard({
  playerId,
  defaultBuyIn,
}: PlayerCardProps) {
  const player = usePlayer(playerId);
  const { cashOut } = usePlayerActions(playerId);

  const [showStackEditor, setShowStackEditor] = useState(false);
  const [showRebuy, setShowRebuy] = useState(false);

  if (!player) return null;

  const isCashedOut = player.status === 'cashed_out';

  function handleCashOut() {
    if (!player) return;
    cashOut(player.currentStack);
  }

  const pnl = player.netProfitLoss;
  const pnlClass =
    pnl > 0
      ? 'bg-profit/20 text-profit shadow-[0_0_8px_rgba(74,222,128,0.25)]'
      : pnl < 0
        ? 'bg-loss/20 text-loss shadow-[0_0_8px_rgba(248,113,113,0.2)]'
        : 'text-white/40';

  return (
    <>
      <div
        className={cn(
          'bg-white/[0.07] border border-white/10 rounded-xl p-3 flex flex-col gap-2 overflow-hidden transition-opacity shadow-lg shadow-black/30 card-hover',
          isCashedOut && 'opacity-40',
        )}
      >
        {/* Row 1: name + P&L badge */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-white font-bold text-sm leading-tight truncate min-w-0">
            {player.name}
          </h3>
          <span
            className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
              pnlClass,
            )}
          >
            <CurrencyDisplay amount={pnl} showSign size="sm" />
          </span>
        </div>

        {/* Row 2: stat chips */}
        <div className="flex gap-2">
          <span className="text-xs text-white/50 bg-white/5 rounded px-2 py-0.5">
            In: {formatChips(player.totalBuyIn)}
          </span>
          <span className="text-xs text-white/50 bg-white/5 rounded px-2 py-0.5">
            Stack: {formatChips(player.currentStack)}
          </span>
          {player.buyInCount > 1 && (
            <span className="text-xs text-white/50 bg-white/5 rounded px-2 py-0.5">
              &times;{player.buyInCount}
            </span>
          )}
        </div>

        {/* Row 3: action buttons */}
        {!isCashedOut ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setShowStackEditor(true)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors bg-white/10 hover:bg-white/20 text-white"
            >
              Stack
            </button>
            <button
              type="button"
              onClick={() => setShowRebuy(true)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors bg-gold/20 hover:bg-gold/30 text-gold"
            >
              Rebuy
            </button>
            <button
              type="button"
              onClick={handleCashOut}
              title="Cash out at current stack"
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors bg-loss/10 hover:bg-loss/20 text-loss"
            >
              Out
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <span className="text-xs text-white/30 font-medium">Cashed Out</span>
          </div>
        )}
      </div>

      {showStackEditor && (
        <StackEditor
          playerId={playerId}
          playerName={player.name}
          currentStack={player.currentStack}
          onClose={() => setShowStackEditor(false)}
        />
      )}

      {showRebuy && (
        <RebuyDialog
          playerId={playerId}
          playerName={player.name}
          defaultBuyIn={defaultBuyIn}
          onClose={() => setShowRebuy(false)}
        />
      )}
    </>
  );
});
