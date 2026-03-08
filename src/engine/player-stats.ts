import type { Session } from '../types/session';
import { projectSession } from './projection';

export interface PlayerStats {
  name: string;
  sessions: number;       // sessions played
  totalProfit: number;    // sum of netProfitLoss
  totalBuyIn: number;     // sum of totalBuyIn
  wins: number;           // sessions with netProfitLoss > 0
  losses: number;         // sessions with netProfitLoss < 0
  biggestWin: number;     // best single-session profit
  biggestLoss: number;    // worst single-session loss (negative number or 0)
  avgProfit: number;      // totalProfit / sessions
  winRate: number;        // wins / sessions (0 to 1)
}

export function computePlayerStats(history: Session[]): Map<string, PlayerStats> {
  const map = new Map<string, PlayerStats>();

  for (const session of history) {
    if (session.status !== 'settled') continue;

    const projection = projectSession(session);

    for (const player of projection.playersByPosition) {
      const key = player.name.toLowerCase().trim();
      const pnl = player.netProfitLoss;

      const existing = map.get(key);
      if (existing) {
        existing.name = player.name; // use most recent name seen
        existing.sessions += 1;
        existing.totalProfit += pnl;
        existing.totalBuyIn += player.totalBuyIn;
        if (pnl > 0) existing.wins += 1;
        if (pnl < 0) existing.losses += 1;
        if (pnl > existing.biggestWin) existing.biggestWin = pnl;
        if (pnl < existing.biggestLoss) existing.biggestLoss = pnl;
      } else {
        map.set(key, {
          name: player.name,
          sessions: 1,
          totalProfit: pnl,
          totalBuyIn: player.totalBuyIn,
          wins: pnl > 0 ? 1 : 0,
          losses: pnl < 0 ? 1 : 0,
          biggestWin: pnl > 0 ? pnl : 0,
          biggestLoss: pnl < 0 ? pnl : 0,
          avgProfit: 0,  // computed after all sessions
          winRate: 0,    // computed after all sessions
        });
      }
    }
  }

  for (const stats of map.values()) {
    stats.avgProfit = stats.totalProfit / stats.sessions;
    stats.winRate = stats.wins / stats.sessions;
  }

  return map;
}
