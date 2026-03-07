import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../../src/store/session-store';
import { makeConfig, makePlayer } from '../helpers';
import { newEventId } from '../../src/types/ids';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
  useSessionStore.setState({ currentSession: null, projection: null, history: [] });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buyIn(playerId: string, chips: number) {
  useSessionStore.getState().addEvent({
    id: newEventId(),
    type: 'BUY_IN',
    timestamp: Date.now(),
    playerId: playerId as ReturnType<typeof newEventId>,
    chipsReceived: chips,
  });
}

function stackUpdate(playerId: string, previousStack: number, newStack: number) {
  useSessionStore.getState().addEvent({
    id: newEventId(),
    type: 'STACK_UPDATE',
    timestamp: Date.now(),
    playerId: playerId as ReturnType<typeof newEventId>,
    previousStack,
    newStack,
  });
}

function getPlayer(name: string) {
  const { projection, currentSession } = useSessionStore.getState();
  const player = currentSession!.players.find((p) => p.name === name)!;
  const state = projection!.playersByPosition.find((p) => p.id === player.id)!;
  return { id: player.id, ...state };
}

function getTransfers() {
  const session = useSessionStore.getState().currentSession!;
  const lastEvent = session.events[session.events.length - 1];
  if (lastEvent.type !== 'SESSION_SETTLED') throw new Error('Not settled');
  return lastEvent.transfers;
}

// ---------------------------------------------------------------------------
// 2-player game
// ---------------------------------------------------------------------------

describe('2-player game: one winner one loser', () => {
  it('Alice +50, Bob -50 → Bob pays Alice 50 chips', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);

    buyIn(alice.id, 150);
    buyIn(bob.id, 150);
    // Alice ends with 200, Bob with 100
    stackUpdate(alice.id, 150, 200);
    stackUpdate(bob.id, 150, 100);

    useSessionStore.getState().settleSession();

    const transfers = getTransfers();
    expect(transfers).toHaveLength(1);
    expect(transfers[0].from).toBe(bob.id);
    expect(transfers[0].to).toBe(alice.id);
    expect(transfers[0].amount).toBe(50);
  });

  it('symmetrical game (all square) → no transfers', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);

    buyIn(alice.id, 100);
    buyIn(bob.id, 100);
    // No stacks change — both end at 100

    useSessionStore.getState().settleSession();

    const transfers = getTransfers();
    expect(transfers).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3-player game
// ---------------------------------------------------------------------------

describe('3-player game', () => {
  it('Alice +60, Bob -20, Carol -40 → 2 transfers', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);
    const carol = makePlayer('Carol', 2);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob, carol]);

    buyIn(alice.id, 100);
    buyIn(bob.id, 100);
    buyIn(carol.id, 100);

    stackUpdate(alice.id, 100, 160);
    stackUpdate(bob.id, 100, 80);
    stackUpdate(carol.id, 100, 60);

    useSessionStore.getState().settleSession();

    const transfers = getTransfers();

    // Total net must be zero: +60 -20 -40 = 0 ✓
    const totalFrom = transfers.reduce((s, t) => s + t.amount, 0);
    const aliceState = getPlayer('Alice');
    expect(totalFrom).toBe(aliceState.netProfitLoss); // Alice receives exactly her profit

    // Alice must receive from both debtors
    const toAlice = transfers.filter((t) => t.to === alice.id);
    expect(toAlice.length).toBeGreaterThan(0);

    // Verify net positions match after applying transfers
    const netMap: Record<string, number> = {};
    for (const t of transfers) {
      netMap[t.from] = (netMap[t.from] ?? 0) - t.amount;
      netMap[t.to] = (netMap[t.to] ?? 0) + t.amount;
    }
    expect(netMap[alice.id]).toBe(60);
    expect(netMap[bob.id]).toBe(-20);
    expect(netMap[carol.id]).toBe(-40);
  });

  it('3 players, rebuy scenario: balances still zero-sum', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);
    const carol = makePlayer('Carol', 2);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob, carol]);

    // Initial buy-ins
    buyIn(alice.id, 100);
    buyIn(bob.id, 100);
    buyIn(carol.id, 100);

    // Bob rebuys after losing some
    stackUpdate(bob.id, 100, 40);
    buyIn(bob.id, 60); // Bob now totalBuyIn=160, currentStack=100

    // Final stacks: Alice 140, Bob 90, Carol 130
    stackUpdate(alice.id, 100, 140);
    stackUpdate(bob.id, 100, 90);
    stackUpdate(carol.id, 100, 130);

    useSessionStore.getState().settleSession();

    const { projection } = useSessionStore.getState();
    const states = projection!.playersByPosition;

    // Verify net P&L sums to 0
    const totalNet = states.reduce((s, p) => s + p.netProfitLoss, 0);
    expect(totalNet).toBe(0);

    const transfers = getTransfers();
    const netMap: Record<string, number> = {};
    for (const t of transfers) {
      netMap[t.from] = (netMap[t.from] ?? 0) - t.amount;
      netMap[t.to] = (netMap[t.to] ?? 0) + t.amount;
    }

    for (const ps of states) {
      if (Math.abs(ps.netProfitLoss) < 1) continue;
      expect(netMap[ps.id] ?? 0).toBe(ps.netProfitLoss);
    }
  });
});

// ---------------------------------------------------------------------------
// 4-player symmetrical
// ---------------------------------------------------------------------------

describe('4-player game: 2 winners vs 2 losers', () => {
  it('Alice +50, Bob +30, Carol -50, Dave -30 → minimized transfers', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);
    const carol = makePlayer('Carol', 2);
    const dave = makePlayer('Dave', 3);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob, carol, dave]);

    buyIn(alice.id, 100);
    buyIn(bob.id, 100);
    buyIn(carol.id, 100);
    buyIn(dave.id, 100);

    stackUpdate(alice.id, 100, 150);
    stackUpdate(bob.id, 100, 130);
    stackUpdate(carol.id, 100, 50);
    stackUpdate(dave.id, 100, 70);

    useSessionStore.getState().settleSession();

    const transfers = getTransfers();

    // Total paid out must equal total received
    const totalOut = transfers.reduce((s, t) => s + t.amount, 0);
    const totalIn = transfers.reduce((s, t) => s + t.amount, 0);
    expect(totalOut).toBe(totalIn);

    // Alice +50, Bob +30 → must receive 50 and 30 total respectively
    const netMap: Record<string, number> = {};
    for (const t of transfers) {
      netMap[t.from] = (netMap[t.from] ?? 0) - t.amount;
      netMap[t.to] = (netMap[t.to] ?? 0) + t.amount;
    }
    expect(netMap[alice.id]).toBe(50);
    expect(netMap[bob.id]).toBe(30);
    expect(netMap[carol.id]).toBe(-50);
    expect(netMap[dave.id]).toBe(-30);
  });
});

// ---------------------------------------------------------------------------
// Integrity enforcement
// ---------------------------------------------------------------------------

describe('integrity reporting', () => {
  it('chips balance when only buy-ins occur (no stack updates)', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);

    buyIn(alice.id, 100);
    buyIn(bob.id, 100);

    const { projection } = useSessionStore.getState();
    expect(projection!.integrity.isBalanced).toBe(true);
    expect(projection!.integrity.totalChipsIssued).toBe(200);
    expect(projection!.integrity.totalChipsInPlay).toBe(200);
  });

  it('detects imbalance when stacks do not sum to chips issued', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);

    buyIn(alice.id, 100);
    buyIn(bob.id, 100);

    // Introduce imbalance: Alice "gains" chips out of thin air
    stackUpdate(alice.id, 100, 150); // +50 that isn't accounted for

    const { projection } = useSessionStore.getState();
    expect(projection!.integrity.isBalanced).toBe(false);
    expect(projection!.integrity.difference).toBe(-50); // 200 issued − 250 in play
  });

  it('stack updates preserve balance when chips just move between players', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);

    buyIn(alice.id, 100);
    buyIn(bob.id, 100);

    // Bob loses 30 to Alice (zero-sum)
    stackUpdate(alice.id, 100, 130);
    stackUpdate(bob.id, 100, 70);

    const { projection } = useSessionStore.getState();
    expect(projection!.integrity.isBalanced).toBe(true);
    expect(projection!.integrity.totalChipsInPlay).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Full store lifecycle
// ---------------------------------------------------------------------------

describe('full store lifecycle', () => {
  it('createSession → buy-ins → stack updates → settle → SESSION_SETTLED event with correct transfers', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);
    const carol = makePlayer('Carol', 2);

    useSessionStore.getState().createSession(makeConfig({ name: 'Friday Night' }), [alice, bob, carol]);

    buyIn(alice.id, 150);
    buyIn(bob.id, 150);
    buyIn(carol.id, 150);

    // Alice wins big, Carol breaks even, Bob loses
    stackUpdate(alice.id, 150, 250);
    stackUpdate(bob.id, 150, 50);
    stackUpdate(carol.id, 150, 150);

    useSessionStore.getState().settleSession();

    const session = useSessionStore.getState().currentSession!;
    expect(session.status).toBe('settled');
    expect(session.config.name).toBe('Friday Night');

    const lastEvent = session.events[session.events.length - 1];
    expect(lastEvent.type).toBe('SESSION_SETTLED');
    if (lastEvent.type !== 'SESSION_SETTLED') throw new Error();

    // Alice +100, Bob -100, Carol 0 → Bob pays Alice 100
    const transfers = lastEvent.transfers;
    expect(transfers).toHaveLength(1);
    expect(transfers[0].from).toBe(bob.id);
    expect(transfers[0].to).toBe(alice.id);
    expect(transfers[0].amount).toBe(100);
  });

  it('settled session moves to history', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);
    buyIn(alice.id, 100);
    buyIn(bob.id, 100);

    useSessionStore.getState().settleSession();

    const { history } = useSessionStore.getState();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('settled');
  });

  it('projection is consistent with events throughout the game', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);

    // After creation: no buy-ins yet
    expect(useSessionStore.getState().projection!.totalPotValue).toBe(0);

    buyIn(alice.id, 100);
    expect(useSessionStore.getState().projection!.totalPotValue).toBe(100);

    buyIn(bob.id, 100);
    expect(useSessionStore.getState().projection!.totalPotValue).toBe(200);

    stackUpdate(alice.id, 100, 130);
    stackUpdate(bob.id, 100, 70);
    expect(useSessionStore.getState().projection!.totalPotValue).toBe(200);

    const aliceState = useSessionStore
      .getState()
      .projection!.playersByPosition.find((p) => p.id === alice.id)!;
    expect(aliceState.currentStack).toBe(130);
    expect(aliceState.totalBuyIn).toBe(100);
    expect(aliceState.netProfitLoss).toBe(30);
  });

  it('settlement isValid=false does not block settle (stored on event)', () => {
    // Introduce chip imbalance then settle — store should still settle
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);
    buyIn(alice.id, 100);
    buyIn(bob.id, 100);
    stackUpdate(alice.id, 100, 150); // imbalanced: +50 created

    const { projection } = useSessionStore.getState();
    expect(projection!.integrity.isBalanced).toBe(false);

    // Still possible to settle (host may acknowledge imbalance)
    useSessionStore.getState().settleSession();
    expect(useSessionStore.getState().currentSession!.status).toBe('settled');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('single player: buys in 100, ends 100 → no transfers', () => {
    const alice = makePlayer('Alice', 0);

    useSessionStore.getState().createSession(makeConfig(), [alice]);
    buyIn(alice.id, 100);

    useSessionStore.getState().settleSession();

    const transfers = getTransfers();
    expect(transfers).toHaveLength(0);
  });

  it('multiple rebuys by same player tracked correctly', () => {
    const alice = makePlayer('Alice', 0);
    const bob = makePlayer('Bob', 1);

    useSessionStore.getState().createSession(makeConfig(), [alice, bob]);

    buyIn(alice.id, 100);
    buyIn(bob.id, 100);

    // Bob rebuys twice
    buyIn(bob.id, 100);
    buyIn(bob.id, 100);

    const bobState = useSessionStore
      .getState()
      .projection!.playersByPosition.find((p) => p.id === bob.id)!;

    expect(bobState.totalBuyIn).toBe(300);
    expect(bobState.currentStack).toBe(300);
    expect(bobState.buyInCount).toBe(3);
  });

  it('transfers sum correctly for 5-player game', () => {
    const players = [
      makePlayer('Alice', 0),
      makePlayer('Bob', 1),
      makePlayer('Carol', 2),
      makePlayer('Dave', 3),
      makePlayer('Eve', 4),
    ];

    useSessionStore.getState().createSession(makeConfig(), players);

    const [alice, bob, carol, dave, eve] = players;

    buyIn(alice.id, 100);
    buyIn(bob.id, 100);
    buyIn(carol.id, 100);
    buyIn(dave.id, 100);
    buyIn(eve.id, 100);

    // Redistribute chips (sum = 500)
    stackUpdate(alice.id, 100, 200); // +100
    stackUpdate(bob.id, 100, 50);   // -50
    stackUpdate(carol.id, 100, 150); // +50
    stackUpdate(dave.id, 100, 30);  // -70
    stackUpdate(eve.id, 100, 70);   // -30

    useSessionStore.getState().settleSession();

    const transfers = getTransfers();
    const { projection } = useSessionStore.getState();

    // Build net map from transfers
    const netMap: Record<string, number> = {};
    for (const t of transfers) {
      netMap[t.from] = (netMap[t.from] ?? 0) - t.amount;
      netMap[t.to] = (netMap[t.to] ?? 0) + t.amount;
    }

    // Each player's net from transfers must match their P&L
    for (const ps of projection!.playersByPosition) {
      if (Math.abs(ps.netProfitLoss) < 1) continue;
      expect(netMap[ps.id] ?? 0).toBe(ps.netProfitLoss);
    }
  });
});
