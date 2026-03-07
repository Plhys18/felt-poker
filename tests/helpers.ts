import { newPlayerId, newSessionId, newEventId } from '../src/types/ids';
import type { Session, SessionConfig, PlayerConfig } from '../src/types/session';
import type { BuyInEvent, StackUpdateEvent, GameStartedEvent } from '../src/types/events';

export function makeConfig(overrides?: Partial<SessionConfig>): SessionConfig {
  return {
    id: newSessionId(),
    name: 'Test Session',
    defaultBuyIn: 20,
    createdAt: Date.now(),
    ...overrides,
  };
}

export function makePlayer(name: string, seatIndex: number): PlayerConfig {
  return { id: newPlayerId(), name, seatIndex };
}

export function makeSession(players: PlayerConfig[], config?: Partial<SessionConfig>): Session {
  const cfg = makeConfig(config);
  const startEvent: GameStartedEvent = {
    id: newEventId(),
    type: 'GAME_STARTED',
    timestamp: Date.now(),
  };
  return {
    schemaVersion: 3,
    config: cfg,
    players,
    events: [startEvent],
    status: 'active',
    endedAt: null,
  };
}

export function makeBuyIn(playerId: string, chips: number): BuyInEvent {
  return {
    id: newEventId(),
    type: 'BUY_IN',
    timestamp: Date.now(),
    playerId: playerId as ReturnType<typeof newPlayerId>,
    chipsReceived: chips,
  };
}

export function makeStackUpdate(playerId: string, previousStack: number, newStack: number): StackUpdateEvent {
  return {
    id: newEventId(),
    type: 'STACK_UPDATE',
    timestamp: Date.now(),
    playerId: playerId as ReturnType<typeof newPlayerId>,
    previousStack,
    newStack,
  };
}
