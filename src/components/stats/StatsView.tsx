import type { ReactNode } from 'react';
import { usePlayerStats } from '../../hooks/use-player-stats';
import { formatChips } from '../../engine/currency';
import { cn } from '../../lib/cn';
import type { PlayerStats } from '../../engine/player-stats';

function StatsBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-white/50 tabular-nums">
      {children}
    </span>
  );
}

function StatsRow({ stats, rank }: { stats: PlayerStats; rank: number }) {
  const winRatePct = Math.round(stats.winRate * 100);
  const isWinning = stats.totalProfit > 0;
  const isLosing = stats.totalProfit < 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.03]">
      {/* Rank + Name + Sessions badge */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className={cn(
            'w-7 flex-shrink-0 text-center text-sm font-bold tabular-nums',
            rank === 1 ? 'text-gold' : rank <= 3 ? 'text-white/70' : 'text-white/30',
          )}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-bold truncate">{stats.name}</p>
            <StatsBadge>{stats.sessions} {stats.sessions === 1 ? 'session' : 'sessions'}</StatsBadge>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="flex items-center gap-4 sm:gap-5 flex-wrap pl-10 sm:pl-0">
        {/* Win Rate */}
        <div className="text-center min-w-[48px]">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Win Rate</p>
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              winRatePct > 50 ? 'text-profit' : winRatePct < 50 ? 'text-loss' : 'text-white/60',
            )}
          >
            {winRatePct}%
          </p>
        </div>

        {/* Avg Profit */}
        <div className="text-center min-w-[64px]">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Avg / Session</p>
          <p
            className={cn(
              'text-sm font-semibold tabular-nums',
              stats.avgProfit > 0 ? 'text-profit' : stats.avgProfit < 0 ? 'text-loss' : 'text-white/60',
            )}
          >
            {stats.avgProfit > 0 ? '+' : ''}{formatChips(stats.avgProfit)}
          </p>
        </div>

        {/* Best Win */}
        <div className="text-center min-w-[64px]">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Best Win</p>
          <p className="text-sm font-semibold tabular-nums text-profit">
            {stats.biggestWin > 0 ? `+${formatChips(stats.biggestWin)}` : '—'}
          </p>
        </div>

        {/* Worst Loss */}
        <div className="text-center min-w-[64px]">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Worst Loss</p>
          <p className="text-sm font-semibold tabular-nums text-loss">
            {stats.biggestLoss < 0 ? formatChips(stats.biggestLoss) : '—'}
          </p>
        </div>

        {/* Total Profit — headline number */}
        <div className="text-right min-w-[72px]">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Total</p>
          <p
            className={cn(
              'text-base font-black tabular-nums',
              isWinning ? 'text-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.4)]' : isLosing ? 'text-loss' : 'text-white/60',
            )}
          >
            {stats.totalProfit > 0 ? '+' : ''}{formatChips(stats.totalProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatsView() {
  const players = usePlayerStats();

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <h2 className="text-white font-black text-xl drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">Player Stats</h2>
          <p className="text-white/40 text-sm mt-0.5">Lifetime stats across all sessions</p>
        </div>

        {players.length === 0 ? (
          <div className="bg-white/[0.06] rounded-2xl border border-white/10 shadow-xl shadow-black/30 px-6 py-16 text-center">
            <p className="text-white/30 text-sm">Play some sessions to see all-time stats here.</p>
          </div>
        ) : (
          <div className="bg-white/[0.06] rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-black/30">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border-b border-white/10">
              <div className="w-7 flex-shrink-0" />
              <div className="flex-1 text-white/40 text-xs font-semibold uppercase tracking-wide">Player</div>
              <div className="hidden sm:flex items-center gap-5 text-white/40 text-xs font-semibold uppercase tracking-wide pr-0">
                <span className="min-w-[48px] text-center">Win Rate</span>
                <span className="min-w-[64px] text-center">Avg / Sess</span>
                <span className="min-w-[64px] text-center">Best Win</span>
                <span className="min-w-[64px] text-center">Worst Loss</span>
                <span className="min-w-[72px] text-right">Total</span>
              </div>
            </div>

            {/* Rows */}
            {players.map((stats, i) => (
              <StatsRow key={stats.name.toLowerCase().trim()} stats={stats} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
