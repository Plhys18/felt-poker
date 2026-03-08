import { memo, useState, useRef } from 'react';
import type { PlayerId } from '../../types/ids';
import { usePlayer } from '../../hooks/use-player';
import { usePlayerActions } from '../../hooks/use-player-actions';
import { useSessionStore } from '../../store/session-store';
import { cn } from '../../lib/cn';
import { formatChips } from '../../engine/currency';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { Dialog } from '../ui/Dialog';
import { StackEditor } from './StackEditor';
import { RebuyDialog } from './RebuyDialog';
import { playChipClink } from '../../lib/sounds';

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
  const renamePlayer = useSessionStore((s) => s.renamePlayer);

  const [showStackEditor, setShowStackEditor] = useState(false);
  const [showRebuy, setShowRebuy] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  if (!player) return null;

  const isCashedOut = player.status === 'cashed_out';

  function handleCashOut() {
    if (!player) return;
    cashOut(player.currentStack);
  }

  function handleOpenRename() {
    if (!player) return;
    setRenameValue(player.name);
    setShowRename(true);
    // Focus the input after the dialog renders
    requestAnimationFrame(() => renameInputRef.current?.focus());
  }

  function handleSaveRename() {
    const trimmed = renameValue.trim();
    if (trimmed) renamePlayer(playerId, trimmed);
    setShowRename(false);
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
          <div className="flex items-center gap-1 min-w-0 group">
            <h3 className="text-white font-bold text-sm leading-tight truncate min-w-0">
              {player.name}
            </h3>
            {!isCashedOut && (
              <button
                type="button"
                onClick={handleOpenRename}
                title="Rename player"
                className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-white/30 hover:text-white/70 transition-all p-0.5 rounded"
                aria-label="Rename player"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" />
                </svg>
              </button>
            )}
          </div>
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
              onClick={() => { playChipClink(); setShowRebuy(true); }}
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

      <Dialog open={showRename} onClose={() => setShowRename(false)} title="Rename Player">
        <div className="flex flex-col gap-4">
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename();
            }}
            placeholder="Player name"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowRename(false)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveRename}
              disabled={!renameValue.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-gold/20 hover:bg-gold/30 text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
});
