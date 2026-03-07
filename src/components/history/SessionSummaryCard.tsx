import type { Session } from '../../types/session';
import type { PlayerState } from '../../types/projection';
import { projectSession } from '../../engine/projection';
import { formatChips } from '../../engine/currency';
import { formatDate, formatDuration } from '../../lib/format';
import { Crown } from '../ui/icons';

interface SessionSummaryCardProps {
  session: Session;
}

export function SessionSummaryCard({ session }: SessionSummaryCardProps) {
  const projection = projectSession(session);
  const config = session.config;

  const duration =
    config.createdAt && session.endedAt
      ? formatDuration(config.createdAt, session.endedAt)
      : null;

  const topWinner: PlayerState | undefined = projection.sortedLeaderboard[0];
  const playerCount = session.players.length;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-base truncate">{config.name}</h3>
          <p className="text-white/40 text-xs mt-0.5">{formatDate(config.createdAt)}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-white/60 text-sm font-semibold">
            {formatChips(projection.totalPotValue)} chips
          </p>
          {duration && <p className="text-white/30 text-xs">{duration}</p>}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3">
        <span className="text-white/40 text-xs">
          {playerCount} player{playerCount !== 1 ? 's' : ''}
        </span>

        {topWinner && topWinner.netProfitLoss > 0 && (
          <>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-1 text-xs">
              <Crown size={13} className="text-gold" />
              <span className="text-white/70 font-semibold">{topWinner.name}</span>
              <span className="text-profit font-bold">
                +{formatChips(topWinner.netProfitLoss)}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
