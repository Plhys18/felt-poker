import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSession } from '../../hooks/use-session';
import { useIntegrity } from '../../hooks/use-integrity';
import { useSessionStore } from '../../store/session-store';
import type { Tab } from '../../hooks/use-tab';
import type { PlayerId } from '../../types/ids';
import { Button } from '../ui/Button';
import { IntegrityBanner } from '../layout/IntegrityBanner';
import { PlayerCard } from './PlayerCard';
import { EventLog } from './EventLog';
import { AddPlayerDialog } from './AddPlayerDialog';

interface TableViewProps {
  setTab: (tab: Tab) => void;
}

export function TableView({ setTab }: TableViewProps) {
  const { config } = useSession();
  const integrity = useIntegrity();
  const settleSession = useSessionStore((s) => s.settleSession);
  const undoLastEvent = useSessionStore((s) => s.undoLastEvent);
  const canUndo = useSessionStore(
    (s) =>
      s.currentSession?.status === 'active' &&
      (s.currentSession?.events.length ?? 0) > 1,
  );

  const playerIds = useSessionStore(
    useShallow((s) => s.projection?.playersByPosition.map((p) => p.id) ?? []),
  );
  const playerNames = useSessionStore(
    useShallow((s): Record<PlayerId, string> => {
      const map: Record<PlayerId, string> = {} as Record<PlayerId, string>;
      for (const p of s.projection?.playersByPosition ?? []) {
        map[p.id] = p.name;
      }
      return map;
    }),
  );

  const [confirmingSettle, setConfirmingSettle] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  if (!config) return null;

  function handleSettle() {
    if (!confirmingSettle) {
      setConfirmingSettle(true);
      return;
    }
    settleSession();
    setTab('settlement');
  }

  return (
    <div>
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Integrity banner */}
        {integrity && !integrity.isBalanced && (
          <IntegrityBanner report={integrity} />
        )}

        {/* Toolbar: Add Player + Undo */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowAddPlayer(true)}
            className="flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-dashed border-white/20 text-white/50 hover:bg-white/10 hover:text-white/70 hover:border-white/40 transition-all text-sm font-semibold"
          >
            <span className="text-lg font-light leading-none">+</span>
            <span>Add Player</span>
          </button>
          {canUndo && (
            <button
              type="button"
              onClick={undoLastEvent}
              title="Undo last action"
              className="flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70 hover:border-white/30 transition-all text-sm font-semibold"
            >
              <span className="text-base leading-none">↩</span>
              <span>Undo</span>
            </button>
          )}
        </div>

        {/* Player grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 w-full">
          {playerIds.map((id) => (
            <PlayerCard
              key={id}
              playerId={id}
              defaultBuyIn={config.defaultBuyIn}
            />
          ))}
        </div>

        {/* Settle button */}
        <div>
          {confirmingSettle ? (
            <div className="space-y-2">
              <p className="text-white/60 text-sm text-center">
                This will end the session and calculate payouts. Are you sure?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => setConfirmingSettle(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  onClick={handleSettle}
                >
                  End &amp; Settle
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setConfirmingSettle(true)}
            >
              Settle &amp; End Session
            </Button>
          )}
        </div>

        {/* Event log */}
        <EventLog playerNames={playerNames} />
      </div>

      {showAddPlayer && (
        <AddPlayerDialog
          defaultBuyIn={config.defaultBuyIn}
          onClose={() => setShowAddPlayer(false)}
        />
      )}
    </div>
  );
}
