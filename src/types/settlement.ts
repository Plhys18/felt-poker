import type { PlayerId } from './ids';

export interface Transfer {
  readonly from: PlayerId;
  readonly to: PlayerId;
  readonly amount: number;
}

export interface Settlement {
  readonly transfers: readonly Transfer[];
  readonly isValid: boolean;
}

export interface ShareableSnapshot {
  readonly n: string;    // session name
  readonly p: Array<{ id: string; name: string; net: number; in: number; stack: number }>;
  readonly ts: number;   // snapshot timestamp
}
