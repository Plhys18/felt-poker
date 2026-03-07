import type { SessionStore } from './session-store';
import type { PlayerState, IntegrityReport, SessionProjection } from '../types/projection';
import type { GameEvent, SessionStatus } from '../types';
import type { Session } from '../types/session';

export const selectProjection = (s: SessionStore): SessionProjection | null => s.projection;

export const selectCurrentSession = (s: SessionStore): Session | null => s.currentSession;

const EMPTY_LEADERBOARD: readonly PlayerState[] = [];
const EMPTY_EVENTS: readonly GameEvent[] = [];

export const selectLeaderboard = (s: SessionStore): readonly PlayerState[] =>
  s.projection?.sortedLeaderboard ?? EMPTY_LEADERBOARD;

export const selectEvents = (s: SessionStore): readonly GameEvent[] =>
  s.projection?.chronologicalEvents ?? EMPTY_EVENTS;

export const selectIntegrity = (s: SessionStore): IntegrityReport | null =>
  s.projection?.integrity ?? null;

export const selectHistory = (s: SessionStore): Session[] => s.history;

export const selectStatus = (s: SessionStore): SessionStatus =>
  s.currentSession?.status ?? 'setup';
