import type { PlayerId } from './ids';
import type { GameEvent } from './events';

export interface PlayerState {
  readonly id: PlayerId;
  readonly name: string;
  readonly seatIndex: number;
  readonly totalBuyIn: number;
  readonly currentStack: number;
  readonly netProfitLoss: number;      // (currentStack / chipDenomination) - totalBuyIn
  readonly buyInCount: number;
  readonly status: 'active' | 'cashed_out';
  readonly cashOutStack: number | null;
}

export interface IntegrityReport {
  readonly totalChipsInPlay: number;
  readonly totalChipsIssued: number;
  readonly difference: number;
  readonly isBalanced: boolean;
}

export interface SessionProjection {
  readonly playersByPosition: readonly PlayerState[];    // by seatIndex
  readonly sortedLeaderboard: readonly PlayerState[];   // by netProfitLoss desc
  readonly chronologicalEvents: readonly GameEvent[];
  readonly integrity: IntegrityReport;
  readonly totalPotValue: number;
  readonly eventCount: number;
  readonly lastEventAt: number | null;
}
