import { create } from 'zustand';
import { lastNightSession } from '../data/lastNightSession';
import type {
  Session,
  SessionConfig,
  PlayerConfig,
  GameEvent,
  SessionProjection,
  SessionSettledEvent,
  PlayerRenamedEvent,
} from '../types';
import type { SessionId } from '../types';
import type { PlayerId } from '../types';
import { newEventId, newPlayerId } from '../types';
import { CURRENT_SCHEMA_VERSION } from '../persistence/constants';
import {
  persistCurrentSession,
  loadCurrentSession,
  persistHistory,
  loadHistory,
} from '../persistence/local-storage';
import { STORAGE_KEYS } from '../persistence/constants';
import { projectSession } from '../engine/projection';
import { computeSettlement } from '../engine/settlement';
import { broadcastState } from '../lib/broadcast-channel';

export interface SessionStore {
  currentSession: Session | null;
  projection: SessionProjection | null;
  history: Session[];

  // Actions
  createSession: (config: SessionConfig, players: PlayerConfig[]) => void;
  addEvent: (event: GameEvent) => void;
  addPlayer: (name: string, chips: number) => void;
  settleSession: () => void;
  resetSession: () => void;
  loadFromStorage: () => void;
  dismissHistory: (sessionId: SessionId) => void;
  /** Wipe all session history. */
  clearHistory: () => void;
  /** Remove the last event from the session (cannot undo past GAME_STARTED). */
  undoLastEvent: () => void;
  /** Rename a player mid-game by appending a PLAYER_RENAMED event. */
  renamePlayer: (playerId: PlayerId, newName: string) => void;
  /** Mirror state received from a sibling tab without re-broadcasting. */
  syncFromBroadcast: (state: Pick<SessionStore, 'currentSession' | 'projection' | 'history'>) => void;
  /** Load the built-in demo session into history (idempotent). */
  loadDemoSession: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  currentSession: null,
  projection: null,
  history: [],

  createSession: (config, players) => {
    const gameStartedEvent: GameEvent = {
      id: newEventId(),
      type: 'GAME_STARTED',
      timestamp: Date.now(),
    };
    // Issue initial buy-in for each player (only when a buy-in amount is set)
    const buyInEvents: GameEvent[] = config.defaultBuyIn > 0
      ? players.map((p) => ({
          id: newEventId(),
          type: 'BUY_IN' as const,
          timestamp: Date.now(),
          playerId: p.id,
          chipsReceived: config.defaultBuyIn,
        }))
      : [];
    const session: Session = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      config,
      players,
      events: [gameStartedEvent, ...buyInEvents],
      status: 'active',
      endedAt: null,
    };
    const projection = projectSession(session);
    persistCurrentSession(session);
    set({ currentSession: session, projection });
  },

  addPlayer: (name, chips) => {
    const { currentSession } = get();
    if (!currentSession) return;
    const newPlayer: PlayerConfig = {
      id: newPlayerId(),
      name: name.trim(),
      seatIndex: currentSession.players.length,
    };
    const buyInEvent: GameEvent = {
      id: newEventId(),
      type: 'BUY_IN',
      timestamp: Date.now(),
      playerId: newPlayer.id,
      chipsReceived: chips,
    };
    const updated: Session = {
      ...currentSession,
      players: [...currentSession.players, newPlayer],
      events: [...currentSession.events, buyInEvent],
    };
    const projection = projectSession(updated);
    persistCurrentSession(updated);
    set({ currentSession: updated, projection });
  },

  addEvent: (event) => {
    const { currentSession } = get();
    if (!currentSession) return;
    const updated: Session = {
      ...currentSession,
      events: [...currentSession.events, event],
    };
    const projection = projectSession(updated);
    persistCurrentSession(updated); // Eager write — no debounce
    set({ currentSession: updated, projection });
  },

  settleSession: () => {
    const { currentSession, projection, history } = get();
    if (!currentSession || !projection) return;

    const settlement = computeSettlement(projection, currentSession.config);
    const event: SessionSettledEvent = {
      id: newEventId(),
      type: 'SESSION_SETTLED',
      timestamp: Date.now(),
      transfers: settlement.transfers,
    };
    const settled: Session = {
      ...currentSession,
      events: [...currentSession.events, event],
      status: 'settled',
      endedAt: Date.now(),
    };
    const newHistory = [settled, ...history].slice(0, 50);
    persistCurrentSession(settled);
    persistHistory(newHistory);
    const settledProjection = projectSession(settled);
    set({
      currentSession: settled,
      projection: settledProjection,
      history: newHistory,
    });
  },

  resetSession: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    window.history.replaceState(null, '', window.location.pathname);
    set({ currentSession: null, projection: null });
  },

  loadFromStorage: () => {
    const current = loadCurrentSession();
    const hist = loadHistory();
    if (current) {
      set({
        currentSession: current,
        projection: projectSession(current),
        history: hist,
      });
    } else {
      set({ history: hist });
    }
  },

  dismissHistory: (sessionId) => {
    const { history } = get();
    const newHistory = history.filter((s) => s.config.id !== sessionId);
    persistHistory(newHistory);
    set({ history: newHistory });
  },

  clearHistory: () => {
    persistHistory([]);
    set({ history: [] });
  },

  undoLastEvent: () => {
    const { currentSession } = get();
    if (!currentSession || currentSession.status === 'settled') return;
    // Never undo past the initial GAME_STARTED event
    if (currentSession.events.length <= 1) return;
    const updated: Session = {
      ...currentSession,
      events: currentSession.events.slice(0, -1),
    };
    const projection = projectSession(updated);
    persistCurrentSession(updated);
    set({ currentSession: updated, projection });
  },

  renamePlayer: (playerId, newName) => {
    const { currentSession } = get();
    if (!currentSession || currentSession.status !== 'active') return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    const event: PlayerRenamedEvent = {
      id: newEventId(),
      type: 'PLAYER_RENAMED',
      timestamp: Date.now(),
      playerId,
      newName: trimmed,
    };
    const updated: Session = {
      ...currentSession,
      events: [...currentSession.events, event],
    };
    const projection = projectSession(updated);
    persistCurrentSession(updated);
    set({ currentSession: updated, projection });
  },

  syncFromBroadcast: (state) => {
    // Mirror state from another tab. The subscriber below is suppressed
    // via _isSyncing to avoid echo loops.
    _isSyncing = true;
    set(state);
    _isSyncing = false;
  },

  loadDemoSession: () => {
    const { history } = get();
    if (history.some(s => s.config.id === lastNightSession.config.id)) return;
    const newHistory = [lastNightSession, ...history].slice(0, 50);
    persistHistory(newHistory);
    set({ history: newHistory });
  },
}));

// ---------------------------------------------------------------------------
// Tab-sync subscriber — single source of truth for broadcasting.
// Fires on every store mutation EXCEPT those from syncFromBroadcast.
// ---------------------------------------------------------------------------
let _isSyncing = false;

useSessionStore.subscribe((state) => {
  if (_isSyncing) return;
  broadcastState({
    currentSession: state.currentSession,
    projection: state.projection,
    history: state.history,
  });
});

export function registerVisibilityPersistence(): () => void {
  const handler = () => {
    if (document.visibilityState === 'hidden') {
      const { currentSession } = useSessionStore.getState();
      if (currentSession) persistCurrentSession(currentSession);
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
