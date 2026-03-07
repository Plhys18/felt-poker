import { decodeShareSnapshot } from '../engine/share';
import { formatChips, formatChipsPnL } from '../engine/currency';
import { formatTime } from '../lib/format';
import { Crown } from './ui/icons';
import { cn } from '../lib/cn';

interface ReadOnlyViewProps {
  encoded: string;
}

export function ReadOnlyView({ encoded }: ReadOnlyViewProps) {
  const snapshot = decodeShareSnapshot(encoded);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-felt-dark flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white font-bold text-lg mb-2">Invalid share link</p>
          <p className="text-white/40 text-sm">This link may have expired or been corrupted.</p>
        </div>
      </div>
    );
  }

  const players = [...snapshot.p].sort((a, b) => b.net - a.net);

  return (
    <div className="min-h-screen bg-felt-dark flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-felt-dark border-b border-white/10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-gold tracking-tight">Felt</span>
            <span className="text-white/30 text-lg">/</span>
            <span className="text-white font-semibold text-sm truncate max-w-[160px]">{snapshot.n}</span>
          </div>
          <span className="text-xs text-white/30 bg-white/5 border border-white/10 px-2 py-1 rounded-full font-semibold uppercase tracking-wide">
            View only
          </span>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-8 px-4 max-w-2xl mx-auto w-full">
        <div className="pt-4 space-y-4">
          {/* Snapshot timestamp */}
          <p className="text-white/30 text-xs text-center">
            Snapshot from {formatTime(snapshot.ts)} — ask the host for a fresh link to see updates
          </p>

          {/* Leaderboard */}
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border-b border-white/10">
              <div className="w-8 flex-shrink-0" />
              <div className="flex-1 text-white/40 text-xs font-semibold uppercase tracking-wide">Player</div>
              <div className="text-right w-20 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">In</div>
              <div className="text-right w-20 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">Stack</div>
              <div className="text-right w-24 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">Net</div>
            </div>

            {players.map((player, i) => {
              const isFirst = i === 0;
              const isPositive = player.net > 0;
              const isNegative = player.net < 0;

              return (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0',
                    isFirst && 'bg-gold/5',
                  )}
                >
                  <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    {isFirst ? (
                      <Crown size={20} className="text-gold" />
                    ) : (
                      <span className={cn('text-sm font-bold tabular-nums', i < 3 ? 'text-white/70' : 'text-white/30')}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('font-bold truncate', isFirst ? 'text-gold' : 'text-white')}>
                      {player.name}
                    </p>
                  </div>

                  <div className="text-right w-20 flex-shrink-0">
                    <p className="text-white/40 text-xs">In</p>
                    <p className="text-white/70 text-sm font-semibold tabular-nums">{formatChips(player.in)}</p>
                  </div>

                  <div className="text-right w-20 flex-shrink-0">
                    <p className="text-white/40 text-xs">Stack</p>
                    <p className="text-white/70 text-sm font-semibold tabular-nums">{formatChips(player.stack)}</p>
                  </div>

                  <div className="text-right w-24 flex-shrink-0">
                    <p className="text-white/40 text-xs">Net</p>
                    <p className={cn(
                      'text-sm font-bold tabular-nums',
                      isPositive ? 'text-profit' : isNegative ? 'text-loss' : 'text-white',
                    )}>
                      {formatChipsPnL(player.net)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-white/20 text-xs text-center">
            This is a read-only view. Join the host's game to play.
          </p>
        </div>
      </main>
    </div>
  );
}
