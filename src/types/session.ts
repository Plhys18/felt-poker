import type { PlayerId, SessionId } from './ids';
import type { GameEvent } from './events';

export type SessionStatus = 'setup' | 'active' | 'settled';

export interface SessionConfig {
  readonly id: SessionId;
  readonly name: string;
  readonly defaultBuyIn: number;      // chips
  readonly createdAt: number;
}

export interface PlayerConfig {
  readonly id: PlayerId;
  readonly name: string;
  readonly seatIndex: number;
}

export interface Session {
  readonly schemaVersion: number;      // 2
  readonly config: SessionConfig;
  readonly players: readonly PlayerConfig[];
  readonly events: readonly GameEvent[];
  readonly status: SessionStatus;
  readonly endedAt: number | null;
}
