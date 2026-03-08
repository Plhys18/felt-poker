import type { Session } from '../types/session';
import type { SessionProjection, PlayerState, IntegrityReport } from '../types/projection';
import type { PlayerId } from '../types/ids';

interface MutablePlayerState {
  id: PlayerId;
  name: string;
  seatIndex: number;
  totalBuyIn: number;
  currentStack: number;
  buyInCount: number;
  status: 'active' | 'cashed_out';
  cashOutStack: number | null;
}

export function projectSession(session: Session): SessionProjection {
  // Initialize mutable state map from PlayerConfig
  const stateMap = new Map<PlayerId, MutablePlayerState>();
  for (const player of session.players) {
    stateMap.set(player.id, {
      id: player.id,
      name: player.name,
      seatIndex: player.seatIndex,
      totalBuyIn: 0,
      currentStack: 0,
      buyInCount: 0,
      status: 'active',
      cashOutStack: null,
    });
  }

  let totalChipsIssued = 0;
  let lastEventAt: number | null = null;

  // Replay events in order
  for (const event of session.events) {
    lastEventAt = event.timestamp;

    switch (event.type) {
      case 'GAME_STARTED':
        // no-op for projection
        break;

      case 'BUY_IN': {
        const ps = stateMap.get(event.playerId);
        if (ps) {
          ps.totalBuyIn += event.chipsReceived;
          ps.currentStack += event.chipsReceived;
          ps.buyInCount += 1;
        }
        totalChipsIssued += event.chipsReceived;
        break;
      }

      case 'STACK_UPDATE': {
        const ps = stateMap.get(event.playerId);
        if (ps) {
          ps.currentStack = event.newStack;
        }
        break;
      }

      case 'CASH_OUT': {
        const ps = stateMap.get(event.playerId);
        if (ps) {
          ps.status = 'cashed_out';
          ps.cashOutStack = event.finalStack;
          ps.currentStack = event.finalStack;
        }
        break;
      }

      case 'REJOIN': {
        const ps = stateMap.get(event.playerId);
        if (ps) {
          ps.status = 'active';
          ps.currentStack = event.stack;
        }
        break;
      }

      case 'SESSION_SETTLED':
        // no-op for projection (transfers recorded on event)
        break;

      case 'PLAYER_RENAMED': {
        const ps = stateMap.get(event.playerId);
        if (ps) {
          ps.name = event.newName;
        }
        break;
      }

      default: {
        // exhaustive check
        const _exhaustive: never = event;
        void _exhaustive;
        break;
      }
    }
  }

  // Build final PlayerState array with computed netProfitLoss
  const playerStates: PlayerState[] = Array.from(stateMap.values()).map((ps) => ({
    id: ps.id,
    name: ps.name,
    seatIndex: ps.seatIndex,
    totalBuyIn: ps.totalBuyIn,
    currentStack: ps.currentStack,
    netProfitLoss: ps.currentStack - ps.totalBuyIn,
    buyInCount: ps.buyInCount,
    status: ps.status,
    cashOutStack: ps.cashOutStack,
  }));

  // playersByPosition: sorted by seatIndex
  const playersByPosition = [...playerStates].sort((a, b) => a.seatIndex - b.seatIndex);

  // sortedLeaderboard: sorted by netProfitLoss descending
  const sortedLeaderboard = [...playerStates].sort((a, b) => b.netProfitLoss - a.netProfitLoss);

  // Integrity report
  const totalChipsInPlay = playerStates.reduce((sum, ps) => sum + ps.currentStack, 0);
  const difference = totalChipsIssued - totalChipsInPlay;
  const integrity: IntegrityReport = {
    totalChipsInPlay,
    totalChipsIssued,
    difference,
    isBalanced: difference === 0,
  };

  const totalPotValue = totalChipsInPlay;

  return {
    playersByPosition,
    sortedLeaderboard,
    chronologicalEvents: session.events,
    integrity,
    totalPotValue,
    eventCount: session.events.length,
    lastEventAt,
  };
}
