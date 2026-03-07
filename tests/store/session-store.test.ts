import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSessionStore } from '../../src/store/session-store';
import { makeConfig, makePlayer } from '../helpers';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ---------------------------------------------------------------------------
// Reset store and localStorage between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  localStorageMock.clear();
  useSessionStore.setState({ currentSession: null, projection: null, history: [] });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSessionStore.createSession', () => {
  it('creates a session with a GAME_STARTED event', () => {
    const config = makeConfig({ name: 'Friday Night Poker' });
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];

    useSessionStore.getState().createSession(config, players);

    const { currentSession } = useSessionStore.getState();
    expect(currentSession).not.toBeNull();
    expect(currentSession!.events).toHaveLength(1);
    expect(currentSession!.events[0].type).toBe('GAME_STARTED');
  });

  it('sets session status to active', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];

    useSessionStore.getState().createSession(config, players);

    const { currentSession } = useSessionStore.getState();
    expect(currentSession!.status).toBe('active');
  });

  it('populates the projection after creation', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];

    useSessionStore.getState().createSession(config, players);

    const { projection } = useSessionStore.getState();
    expect(projection).not.toBeNull();
    expect(projection!.playersByPosition).toHaveLength(2);
  });

  it('stores players in the session', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1), makePlayer('Carol', 2)];

    useSessionStore.getState().createSession(config, players);

    const { currentSession } = useSessionStore.getState();
    expect(currentSession!.players).toHaveLength(3);
  });

  it('persists the session to localStorage', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];

    useSessionStore.getState().createSession(config, players);

    const stored = localStorage.getItem('felt:current');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.status).toBe('active');
  });
});

describe('useSessionStore.addEvent', () => {
  it('adds an event to currentSession.events', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];

    useSessionStore.getState().createSession(config, players);

    const { currentSession } = useSessionStore.getState();
    const alice = currentSession!.players[0];

    useSessionStore.getState().addEvent({
      id: 'evt-test-001' as ReturnType<typeof import('../../src/types/ids').newEventId>,
      type: 'BUY_IN',
      timestamp: Date.now(),
      playerId: alice.id,
      chipsReceived: 20,
    });

    const updated = useSessionStore.getState().currentSession;
    expect(updated!.events).toHaveLength(2); // GAME_STARTED + BUY_IN
    expect(updated!.events[1].type).toBe('BUY_IN');
  });

  it('updates the projection after adding an event', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];

    useSessionStore.getState().createSession(config, players);

    const { currentSession } = useSessionStore.getState();
    const alice = currentSession!.players[0];

    useSessionStore.getState().addEvent({
      id: 'evt-test-002' as ReturnType<typeof import('../../src/types/ids').newEventId>,
      type: 'BUY_IN',
      timestamp: Date.now(),
      playerId: alice.id,
      chipsReceived: 20,
    });

    const { projection } = useSessionStore.getState();
    const aliceState = projection!.playersByPosition.find((p) => p.id === alice.id)!;
    expect(aliceState.totalBuyIn).toBe(20);
    expect(aliceState.currentStack).toBe(20);
  });

  it('does nothing when there is no currentSession', () => {
    // No session created — addEvent should be a no-op
    useSessionStore.getState().addEvent({
      id: 'evt-test-003' as ReturnType<typeof import('../../src/types/ids').newEventId>,
      type: 'GAME_STARTED',
      timestamp: Date.now(),
    });

    const { currentSession } = useSessionStore.getState();
    expect(currentSession).toBeNull();
  });
});

describe('useSessionStore.settleSession', () => {
  it('adds a SESSION_SETTLED event', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];

    useSessionStore.getState().createSession(config, players);

    // Add buy-ins so we have a valid balanced state
    const session = useSessionStore.getState().currentSession!;
    const [alice, bob] = session.players;

    useSessionStore.getState().addEvent({
      id: 'evt-bi-a' as ReturnType<typeof import('../../src/types/ids').newEventId>,
      type: 'BUY_IN',
      timestamp: Date.now(),
      playerId: alice.id,
      chipsReceived: 20,
    });
    useSessionStore.getState().addEvent({
      id: 'evt-bi-b' as ReturnType<typeof import('../../src/types/ids').newEventId>,
      type: 'BUY_IN',
      timestamp: Date.now(),
      playerId: bob.id,
      chipsReceived: 20,
    });

    useSessionStore.getState().settleSession();

    const settled = useSessionStore.getState().currentSession!;
    const lastEvent = settled.events[settled.events.length - 1];
    expect(lastEvent.type).toBe('SESSION_SETTLED');
  });

  it('sets session status to settled', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];

    useSessionStore.getState().createSession(config, players);
    useSessionStore.getState().settleSession();

    const { currentSession } = useSessionStore.getState();
    expect(currentSession!.status).toBe('settled');
  });

  it('moves settled session to history', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];

    useSessionStore.getState().createSession(config, players);
    useSessionStore.getState().settleSession();

    const { history } = useSessionStore.getState();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('settled');
  });

  it('sets endedAt timestamp on settled session', () => {
    const before = Date.now();
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];

    useSessionStore.getState().createSession(config, players);
    useSessionStore.getState().settleSession();

    const after = Date.now();
    const { currentSession } = useSessionStore.getState();
    expect(currentSession!.endedAt).not.toBeNull();
    expect(currentSession!.endedAt!).toBeGreaterThanOrEqual(before);
    expect(currentSession!.endedAt!).toBeLessThanOrEqual(after);
  });

  it('does nothing when there is no currentSession', () => {
    // Should not throw
    useSessionStore.getState().settleSession();
    expect(useSessionStore.getState().history).toHaveLength(0);
  });
});

describe('useSessionStore.loadFromStorage', () => {
  it('loads a persisted session from localStorage', () => {
    // First: create and persist a session via the store
    const config = makeConfig({ name: 'Persisted Game' });
    const players = [makePlayer('Alice', 0)];
    useSessionStore.getState().createSession(config, players);

    // Reset in-memory state, simulating an app reload
    useSessionStore.setState({ currentSession: null, projection: null, history: [] });

    // Now load from storage
    useSessionStore.getState().loadFromStorage();

    const { currentSession, projection } = useSessionStore.getState();
    expect(currentSession).not.toBeNull();
    expect(currentSession!.config.name).toBe('Persisted Game');
    expect(projection).not.toBeNull();
  });

  it('does not crash when localStorage is empty', () => {
    // localStorage is already cleared by beforeEach
    useSessionStore.getState().loadFromStorage();

    const { currentSession } = useSessionStore.getState();
    expect(currentSession).toBeNull();
  });

  it('loads history from localStorage', () => {
    // Create and settle a session to put it in history
    const config = makeConfig({ name: 'Old Game' });
    const players = [makePlayer('Alice', 0)];
    useSessionStore.getState().createSession(config, players);
    useSessionStore.getState().settleSession();

    // Reset in-memory state
    useSessionStore.setState({ currentSession: null, projection: null, history: [] });

    // Load from storage — currentSession is now settled, history has it
    useSessionStore.getState().loadFromStorage();

    // The settled session is set as currentSession (it's in the current slot)
    // and also in history
    const { history } = useSessionStore.getState();
    expect(history).toHaveLength(1);
    expect(history[0].config.name).toBe('Old Game');
  });
});

describe('useSessionStore.dismissHistory', () => {
  it('removes a session from history by id', () => {
    const config = makeConfig({ name: 'Game A' });
    const players = [makePlayer('Alice', 0)];
    useSessionStore.getState().createSession(config, players);
    useSessionStore.getState().settleSession();

    const { history } = useSessionStore.getState();
    expect(history).toHaveLength(1);

    const sessionId = history[0].config.id;
    useSessionStore.getState().dismissHistory(sessionId);

    expect(useSessionStore.getState().history).toHaveLength(0);
  });

  it('leaves other history entries intact when dismissing one', () => {
    // Create and settle two sessions
    const players = [makePlayer('Alice', 0)];

    useSessionStore.getState().createSession(makeConfig({ name: 'Game A' }), players);
    useSessionStore.getState().settleSession();

    // Start a new session and settle it too (previous becomes part of history)
    useSessionStore.setState({ currentSession: null, projection: null });
    useSessionStore.getState().createSession(makeConfig({ name: 'Game B' }), players);
    useSessionStore.getState().settleSession();

    const { history } = useSessionStore.getState();
    expect(history).toHaveLength(2);

    // Dismiss the first (most recent) history entry
    const idToDismiss = history[0].config.id;
    useSessionStore.getState().dismissHistory(idToDismiss);

    const remaining = useSessionStore.getState().history;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].config.id).not.toBe(idToDismiss);
  });

  it('does nothing when the sessionId is not in history', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];
    useSessionStore.getState().createSession(config, players);
    useSessionStore.getState().settleSession();

    const beforeLength = useSessionStore.getState().history.length;

    useSessionStore.getState().dismissHistory(
      'nonexistent-id' as ReturnType<typeof import('../../src/types/ids').newSessionId>,
    );

    expect(useSessionStore.getState().history).toHaveLength(beforeLength);
  });

  it('persists the updated history to localStorage after dismiss', () => {
    const config = makeConfig();
    const players = [makePlayer('Alice', 0)];
    useSessionStore.getState().createSession(config, players);
    useSessionStore.getState().settleSession();

    const { history } = useSessionStore.getState();
    const sessionId = history[0].config.id;
    useSessionStore.getState().dismissHistory(sessionId);

    const stored = localStorage.getItem('felt:history');
    expect(stored).not.toBeNull();
    const parsed: unknown[] = JSON.parse(stored!);
    expect(parsed).toHaveLength(0);
  });
});
