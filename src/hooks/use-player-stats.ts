import { useMemo } from 'react';
import { useSessionStore } from '../store/session-store';
import { computePlayerStats, type PlayerStats } from '../engine/player-stats';

export function usePlayerStats(): PlayerStats[] {
  const history = useSessionStore((s) => s.history);
  return useMemo(() => {
    const map = computePlayerStats(history);
    return [...map.values()].sort((a, b) => b.totalProfit - a.totalProfit);
  }, [history]);
}
