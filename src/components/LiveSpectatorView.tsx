import { useCallback, useEffect, useRef, useState } from 'react';
import type { ShareableSnapshot } from '../types/settlement';
import type { PeerConnectionStatus } from '../lib/peer-sync';
import { formatChips, formatChipsPnL } from '../engine/currency';
import { formatTime } from '../lib/format';
import { Crown } from './ui/icons';
import { cn } from '../lib/cn';

const RECONNECT_DELAY_MS = 4000;

interface LiveSpectatorViewProps {
  sessionId: string;
}

export function LiveSpectatorView({ sessionId }: LiveSpectatorViewProps) {
  const [snapshot, setSnapshot] = useState<ShareableSnapshot | null>(null);
  const [status, setStatus] = useState<PeerConnectionStatus>('connecting');
  const cleanupRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const connect = useCallback(() => {
    let cancelled = false;

    setStatus('connecting');
    import('../lib/peer-sync').then(({ createSpectatorPeer }) => {
      if (cancelled) return;
      createSpectatorPeer(
        sessionId,
        (snap) => { setSnapshot(snap); },
        (s) => {
          setStatus(s);
          // Auto-reconnect after a short delay when disconnected
          if (s === 'disconnected' && !cancelled) {
            reconnectTimerRef.current = setTimeout(() => {
              if (!cancelled) connect();
            }, RECONNECT_DELAY_MS);
          }
        },
      )
        .then((cleanup) => {
          if (cancelled) { cleanup(); return; }
          cleanupRef.current = cleanup;
        })
        .catch(() => setStatus('disconnected'));
    });

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    attemptRef.current += 1;
    const cleanup = connect();
    return () => {
      cleanup();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  // connect is stable (useCallback with sessionId dep) — this is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const players = snapshot ? [...snapshot.p].sort((a, b) => b.net - a.net) : [];

  return (
    <div className="min-h-screen bg-felt-dark flex flex-col">
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 bg-felt-dark border-b border-white/10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-gold tracking-tight">Felt</span>
            {snapshot && (
              <>
                <span className="text-white/30 text-lg">/</span>
                <span className="text-white font-semibold text-sm truncate max-w-[160px]">
                  {snapshot.n}
                </span>
              </>
            )}
          </div>
          <StatusPill status={status} />
        </div>
      </header>

      <main className="flex-1 pt-16 pb-8 px-4 max-w-2xl mx-auto w-full">
        <div className="pt-4 space-y-4">
          {/* No snapshot yet — show connection state */}
          {!snapshot && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              {status !== 'disconnected' && (
                <>
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                  <p className="text-white/40 text-sm">Connecting to host…</p>
                </>
              )}
              {status === 'disconnected' && (
                <>
                  <p className="text-white font-bold">Host is offline</p>
                  <p className="text-white/40 text-sm text-center">
                    Retrying in {RECONNECT_DELAY_MS / 1000}s — keep this page open.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Show last known snapshot while reconnecting */}
          {snapshot && status === 'disconnected' && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-semibold">
              <div className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin flex-shrink-0" />
              Reconnecting — showing last known state
            </div>
          )}

          {/* Live leaderboard */}
          {snapshot && (
            <>
              <p className="text-white/30 text-xs text-center">
                Updated {formatTime(snapshot.ts)}
              </p>

              <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border-b border-white/10">
                  <div className="w-8 flex-shrink-0" />
                  <div className="flex-1 text-white/40 text-xs font-semibold uppercase tracking-wide">
                    Player
                  </div>
                  <div className="text-right w-16 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">
                    In
                  </div>
                  <div className="hidden sm:block text-right w-16 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">
                    Stack
                  </div>
                  <div className="text-right w-20 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">
                    Net
                  </div>
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
                          <span
                            className={cn(
                              'text-sm font-bold tabular-nums',
                              i < 3 ? 'text-white/70' : 'text-white/30',
                            )}
                          >
                            {i + 1}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn('font-bold truncate', isFirst ? 'text-gold' : 'text-white')}>
                          {player.name}
                        </p>
                      </div>

                      <div className="text-right w-16 flex-shrink-0">
                        <p className="text-white/40 text-xs">In</p>
                        <p className="text-white/70 text-sm font-semibold tabular-nums">
                          {formatChips(player.in)}
                        </p>
                      </div>

                      <div className="hidden sm:block text-right w-16 flex-shrink-0">
                        <p className="text-white/40 text-xs">Stack</p>
                        <p className="text-white/70 text-sm font-semibold tabular-nums">
                          {formatChips(player.stack)}
                        </p>
                      </div>

                      <div className="text-right w-20 flex-shrink-0">
                        <p className="text-white/40 text-xs">Net</p>
                        <p
                          className={cn(
                            'text-sm font-bold tabular-nums',
                            isPositive
                              ? 'text-profit'
                              : isNegative
                                ? 'text-loss'
                                : 'text-white',
                          )}
                        >
                          {formatChipsPnL(player.net)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-white/20 text-xs text-center">
                Read-only live view — join the host's game to play.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: PeerConnectionStatus }) {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
        </span>
        <span className="text-xs text-profit font-semibold">Live</span>
      </div>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="text-xs text-white/40 font-semibold animate-pulse">Connecting…</span>
    );
  }
  return (
    <span className="text-xs text-amber-400 font-semibold animate-pulse">Reconnecting…</span>
  );
}
