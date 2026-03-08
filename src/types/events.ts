import type { EventId, PlayerId } from './ids';
import type { Transfer } from './settlement';

export interface BaseEvent {
  readonly id: EventId;
  readonly timestamp: number;
}

export interface GameStartedEvent extends BaseEvent {
  readonly type: 'GAME_STARTED';
}

export interface BuyInEvent extends BaseEvent {
  readonly type: 'BUY_IN';
  readonly playerId: PlayerId;
  readonly chipsReceived: number;
}

export interface StackUpdateEvent extends BaseEvent {
  readonly type: 'STACK_UPDATE';
  readonly playerId: PlayerId;
  readonly previousStack: number;
  readonly newStack: number;
}

export interface CashOutEvent extends BaseEvent {
  readonly type: 'CASH_OUT';
  readonly playerId: PlayerId;
  readonly finalStack: number;
}

export interface RejoinEvent extends BaseEvent {
  readonly type: 'REJOIN';
  readonly playerId: PlayerId;
  readonly stack: number;
}

export interface SessionSettledEvent extends BaseEvent {
  readonly type: 'SESSION_SETTLED';
  readonly transfers: readonly Transfer[];
}

export interface PlayerRenamedEvent extends BaseEvent {
  readonly type: 'PLAYER_RENAMED';
  readonly playerId: PlayerId;
  readonly newName: string;
}

export type GameEvent =
  | GameStartedEvent
  | BuyInEvent
  | StackUpdateEvent
  | CashOutEvent
  | RejoinEvent
  | SessionSettledEvent
  | PlayerRenamedEvent;
