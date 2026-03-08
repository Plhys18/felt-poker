import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSettlement } from '../../hooks/use-settlement';
import { useSession } from '../../hooks/use-session';
import { useSessionStore } from '../../store/session-store';
import type { SessionStore } from '../../store/session-store';
import type { Tab } from '../../hooks/use-tab';
import type { PlayerId } from '../../types/ids';
import { formatChips } from '../../engine/currency';
import { formatDate, formatDuration } from '../../lib/format';
import { exportSessionCSV, exportSessionJSON } from '../../lib/export';
import { Button } from '../ui/Button';
import { TransferCard } from './TransferCard';
import { ShareButton } from './ShareButton';

interface SettlementViewProps {
  setTab: (tab: Tab) => void;
}

function selectTotalPot(s: SessionStore) {
  return s.projection?.totalPotValue ?? 0;
}

function selectCurrentSession(s: SessionStore) {
  return s.currentSession;
}

export function SettlementView({ setTab }: SettlementViewProps) {
  const settlement = useSettlement();
  const { config } = useSession();
  const playerNames = useSessionStore(
    useShallow((s): Record<PlayerId, string> => {
      const map: Record<PlayerId, string> = {} as Record<PlayerId, string>;
      for (const p of s.projection?.playersByPosition ?? []) {
        map[p.id] = p.name;
      }
      return map;
    }),
  );
  const totalPot = useSessionStore(selectTotalPot);
  const currentSession = useSessionStore(selectCurrentSession);

  const [paidSet, setPaidSet] = useState<Set<number>>(new Set());

  if (!config || !settlement) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/30 text-sm">No settlement available</p>
      </div>
    );
  }

  const duration =
    currentSession?.config.createdAt && currentSession.endedAt
      ? formatDuration(currentSession.config.createdAt, currentSession.endedAt)
      : null;

  const sessionDate = currentSession?.config.createdAt
    ? formatDate(currentSession.config.createdAt)
    : null;

  const resetSession = useSessionStore((s) => s.resetSession);

  function handleNewGame() {
    resetSession();
    setTab('setup');
  }

  function handleTogglePaid(i: number) {
    setPaidSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  const totalTransfers = settlement.transfers.length;
  const paidCount = paidSet.size;
  const allPaid = totalTransfers > 0 && paidCount === totalTransfers;

  return (
    <div>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center py-6">
          <p className="text-5xl mb-3 drop-shadow-[0_0_20px_rgba(201,168,76,0.5)]">{'\uD83C\uDFC6'}</p>
          <h2 className="text-white font-black text-2xl tracking-tight">Session Complete</h2>
          <p className="text-gold/80 text-sm mt-1 font-semibold">{config.name}</p>
          {sessionDate && (
            <p className="text-white/30 text-xs mt-0.5">{sessionDate}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.07] rounded-xl border border-white/10 px-4 py-4 text-center shadow-lg shadow-black/20">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-1">
              Total Pot
            </p>
            <p className="text-white font-black text-xl">
              {formatChips(totalPot)} chips
            </p>
          </div>
          {duration && (
            <div className="bg-white/[0.07] rounded-xl border border-white/10 px-4 py-4 text-center shadow-lg shadow-black/20">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-1">
                Duration
              </p>
              <p className="text-white font-black text-xl">{duration}</p>
            </div>
          )}
        </div>

        {/* Transfers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wide">
              Payouts &mdash;{' '}
              {totalTransfers} transfer
              {totalTransfers !== 1 ? 's' : ''}
            </h3>
            {paidCount > 0 && !allPaid && (
              <span className="text-gold text-xs font-semibold">
                {paidCount} / {totalTransfers} paid
              </span>
            )}
          </div>

          {allPaid && (
            <div className="bg-profit/10 rounded-xl border border-profit/30 px-4 py-3 text-center">
              <p className="text-profit font-semibold text-sm">
                All settled up! 🎉
              </p>
            </div>
          )}

          {totalTransfers === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 px-4 py-5 text-center">
              <p className="text-profit font-semibold">
                All square! No transfers needed.
              </p>
            </div>
          ) : (
            settlement.transfers.map((transfer, i) => (
              <TransferCard
                key={i}
                transfer={transfer}
                playerNames={playerNames}
                isPaid={paidSet.has(i)}
                onToggle={() => handleTogglePaid(i)}
              />
            ))
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <ShareButton />
          {currentSession !== null && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => exportSessionCSV(currentSession)}
              >
                Export CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => exportSessionJSON(currentSession)}
              >
                Export JSON
              </Button>
            </div>
          )}
          <Button variant="primary" size="lg" fullWidth onClick={handleNewGame}>
            New Game
          </Button>
        </div>
      </div>
    </div>
  );
}
