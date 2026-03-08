import { useState } from 'react';
import type { Session } from '../../types/session';
import type { PlayerState } from '../../types/projection';
import { projectSession } from '../../engine/projection';
import { formatChips } from '../../engine/currency';
import { formatDate, formatDuration } from '../../lib/format';
import { Crown } from '../ui/icons';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useSessionStore } from '../../store/session-store';

interface SessionSummaryCardProps {
  session: Session;
}

export function SessionSummaryCard({ session }: SessionSummaryCardProps) {
  const dismissHistory = useSessionStore((s) => s.dismissHistory);
  const [showConfirm, setShowConfirm] = useState(false);

  const projection = projectSession(session);
  const config = session.config;

  const duration =
    config.createdAt && session.endedAt
      ? formatDuration(config.createdAt, session.endedAt)
      : null;

  const topWinner: PlayerState | undefined = projection.sortedLeaderboard[0];
  const playerCount = session.players.length;

  function handleDelete() {
    dismissHistory(session.config.id);
    setShowConfirm(false);
  }

  return (
    <>
      <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-base truncate">{config.name}</h3>
            <p className="text-white/40 text-xs mt-0.5">{formatDate(config.createdAt)}</p>
          </div>
          <div className="flex items-start gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-white/60 text-sm font-semibold">
                {formatChips(projection.totalPotValue)} chips
              </p>
              {duration && <p className="text-white/30 text-xs">{duration}</p>}
            </div>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              title="Delete session"
              className="text-white/20 hover:text-loss transition-colors p-0.5 mt-0.5"
              aria-label="Delete session"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>
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

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Delete Session"
      >
        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            Delete <span className="text-white font-semibold">"{config.name}"</span>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="md" fullWidth onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" fullWidth onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
