import type { GameEvent } from '../types/events';
import type { PlayerState, IntegrityReport } from '../types/projection';

// O(n) scan: count chipsReceived from BUY_IN events for totalChipsIssued,
// sum currentStack from playerStates for totalChipsInPlay.
export function computeIntegrity(
  events: readonly GameEvent[],
  playerStates: readonly PlayerState[],
): IntegrityReport {
  let totalChipsIssued = 0;

  for (const event of events) {
    if (event.type === 'BUY_IN') {
      totalChipsIssued += event.chipsReceived;
    }
  }

  const totalChipsInPlay = playerStates.reduce((sum, ps) => sum + ps.currentStack, 0);
  const difference = totalChipsIssued - totalChipsInPlay;

  return {
    totalChipsInPlay,
    totalChipsIssued,
    difference,
    isBalanced: difference === 0,
  };
}
