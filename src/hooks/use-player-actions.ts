import { useSessionStore } from '../store/session-store';
import { newEventId } from '../types/ids';
import type { PlayerId } from '../types/ids';

export function usePlayerActions(playerId: PlayerId): {
  rebuy: (chips: number) => void;
  updateStack: (newStack: number, previousStack: number) => void;
  cashOut: (finalStack: number) => void;
} {
  const addEvent = useSessionStore((s) => s.addEvent);

  const rebuy = (chips: number) => {
    addEvent({
      id: newEventId(),
      type: 'BUY_IN',
      timestamp: Date.now(),
      playerId,
      chipsReceived: chips,
    });
  };

  const updateStack = (newStack: number, previousStack: number) => {
    addEvent({
      id: newEventId(),
      type: 'STACK_UPDATE',
      timestamp: Date.now(),
      playerId,
      previousStack,
      newStack,
    });
  };

  const cashOut = (finalStack: number) => {
    addEvent({
      id: newEventId(),
      type: 'CASH_OUT',
      timestamp: Date.now(),
      playerId,
      finalStack,
    });
  };

  return { rebuy, updateStack, cashOut };
}
