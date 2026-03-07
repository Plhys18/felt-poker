import { describe, it, expect } from 'vitest';
import { projectSession } from '../../src/engine/projection';
import { makeSession, makePlayer, makeBuyIn, makeStackUpdate } from '../helpers';
import { newEventId } from '../../src/types/ids';
import type { CashOutEvent, RejoinEvent } from '../../src/types/events';

describe('projectSession', () => {
  it('returns empty projection for session with only GAME_STARTED', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const proj = projectSession(session);

    expect(proj.playersByPosition).toHaveLength(2);
    expect(proj.sortedLeaderboard).toHaveLength(2);
    expect(proj.totalPotValue).toBe(0);
    expect(proj.integrity.isBalanced).toBe(true);
  });

  it('correctly projects buy-in events', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const alice = players[0];

    const withBuyIn = {
      ...session,
      events: [...session.events, makeBuyIn(alice.id, 20)],
    };
    const proj = projectSession(withBuyIn);

    const aliceState = proj.playersByPosition.find((p) => p.id === alice.id)!;
    expect(aliceState.totalBuyIn).toBe(20);
    expect(aliceState.currentStack).toBe(20);
    expect(aliceState.buyInCount).toBe(1);
  });

  it('correctly computes netProfitLoss after stack update', () => {
    const players = [makePlayer('Alice', 0)];
    const session = makeSession(players);
    const alice = players[0];

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(alice.id, 20),
        makeStackUpdate(alice.id, 20, 35),
      ],
    };
    const proj = projectSession(withEvents);
    const aliceState = proj.playersByPosition.find((p) => p.id === alice.id)!;

    expect(aliceState.currentStack).toBe(35);
    expect(aliceState.netProfitLoss).toBe(15); // 35 - 20
  });

  it('sortedLeaderboard is sorted by netProfitLoss descending', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1), makePlayer('Carol', 2)];
    const session = makeSession(players);

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(players[0].id, 20),
        makeBuyIn(players[1].id, 20),
        makeBuyIn(players[2].id, 20),
        makeStackUpdate(players[0].id, 20, 40), // Alice +20
        makeStackUpdate(players[1].id, 20, 10), // Bob -10
        makeStackUpdate(players[2].id, 20, 10), // Carol -10
      ],
    };
    const proj = projectSession(withEvents);

    expect(proj.sortedLeaderboard[0].name).toBe('Alice');
    expect(proj.sortedLeaderboard[0].netProfitLoss).toBe(20);
  });

  it('handles chips correctly: buy 100 chips, stack grows to 150 → net +50', () => {
    const players = [makePlayer('Alice', 0)];
    const session = makeSession(players);
    const alice = players[0];

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(alice.id, 100),
        makeStackUpdate(alice.id, 100, 150),
      ],
    };
    const proj = projectSession(withEvents);
    const aliceState = proj.playersByPosition.find((p) => p.id === alice.id)!;

    expect(aliceState.currentStack).toBe(150);
    expect(aliceState.netProfitLoss).toBe(50); // 150 - 100
  });

  // --- New tests ---

  it('cash out: player status becomes cashed_out, cashOutStack and currentStack set to finalStack', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const alice = players[0];

    const cashOutEvent: CashOutEvent = {
      id: newEventId(),
      type: 'CASH_OUT',
      timestamp: Date.now(),
      playerId: alice.id,
      finalStack: 35,
    };

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(alice.id, 20),
        makeStackUpdate(alice.id, 20, 35),
        cashOutEvent,
      ],
    };
    const proj = projectSession(withEvents);
    const aliceState = proj.playersByPosition.find((p) => p.id === alice.id)!;

    expect(aliceState.status).toBe('cashed_out');
    expect(aliceState.cashOutStack).toBe(35);
    expect(aliceState.currentStack).toBe(35);
  });

  it('rejoin: player cashes out then rejoins → status active, currentStack updated', () => {
    const players = [makePlayer('Alice', 0)];
    const session = makeSession(players);
    const alice = players[0];

    const cashOutEvent: CashOutEvent = {
      id: newEventId(),
      type: 'CASH_OUT',
      timestamp: Date.now(),
      playerId: alice.id,
      finalStack: 30,
    };
    const rejoinEvent: RejoinEvent = {
      id: newEventId(),
      type: 'REJOIN',
      timestamp: Date.now(),
      playerId: alice.id,
      stack: 30,
    };

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(alice.id, 20),
        cashOutEvent,
        rejoinEvent,
      ],
    };
    const proj = projectSession(withEvents);
    const aliceState = proj.playersByPosition.find((p) => p.id === alice.id)!;

    expect(aliceState.status).toBe('active');
    expect(aliceState.currentStack).toBe(30);
  });

  it('multiple rebuys: buyInCount=3, totalBuyIn=60', () => {
    const players = [makePlayer('Alice', 0)];
    const session = makeSession(players);
    const alice = players[0];

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(alice.id, 20),
        makeBuyIn(alice.id, 20),
        makeBuyIn(alice.id, 20),
      ],
    };
    const proj = projectSession(withEvents);
    const aliceState = proj.playersByPosition.find((p) => p.id === alice.id)!;

    expect(aliceState.buyInCount).toBe(3);
    expect(aliceState.totalBuyIn).toBe(60);
  });

  it('buy 100 chips, stack stays 100 → netProfitLoss=0', () => {
    const players = [makePlayer('Alice', 0)];
    const session = makeSession(players);
    const alice = players[0];

    const withEvents = {
      ...session,
      events: [...session.events, makeBuyIn(alice.id, 100)],
    };
    const proj = projectSession(withEvents);
    const aliceState = proj.playersByPosition.find((p) => p.id === alice.id)!;

    expect(aliceState.netProfitLoss).toBe(0);
  });

  it('playersByPosition sorts by seatIndex regardless of insertion order', () => {
    // Create players in reverse seat order to test sorting
    const alice = makePlayer('Alice', 2);
    const bob = makePlayer('Bob', 0);
    const carol = makePlayer('Carol', 1);
    // Players array inserted in order: alice(seat2), bob(seat0), carol(seat1)
    const session = makeSession([alice, bob, carol]);
    const proj = projectSession(session);

    expect(proj.playersByPosition[0].name).toBe('Bob');   // seat 0
    expect(proj.playersByPosition[1].name).toBe('Carol'); // seat 1
    expect(proj.playersByPosition[2].name).toBe('Alice'); // seat 2
  });

  it('sortedLeaderboard sorts by netProfitLoss desc even when all are negative', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1), makePlayer('Carol', 2)];
    const session = makeSession(players);

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(players[0].id, 20),
        makeBuyIn(players[1].id, 20),
        makeBuyIn(players[2].id, 20),
        makeStackUpdate(players[0].id, 20, 15), // Alice -5
        makeStackUpdate(players[1].id, 20, 5),  // Bob -15
        makeStackUpdate(players[2].id, 20, 10), // Carol -10
      ],
    };
    const proj = projectSession(withEvents);

    // All negative; sorted descending means least negative first
    expect(proj.sortedLeaderboard[0].name).toBe('Alice');   // -5 (least negative)
    expect(proj.sortedLeaderboard[1].name).toBe('Carol');  // -10
    expect(proj.sortedLeaderboard[2].name).toBe('Bob');    // -15 (most negative)
  });

  it('eventCount and lastEventAt are correct', () => {
    const players = [makePlayer('Alice', 0)];
    const session = makeSession(players);
    const alice = players[0];

    const buyIn = makeBuyIn(alice.id, 20);
    const stackUpdate = makeStackUpdate(alice.id, 20, 25);

    const withEvents = {
      ...session,
      events: [...session.events, buyIn, stackUpdate],
    };
    const proj = projectSession(withEvents);

    // GAME_STARTED + BUY_IN + STACK_UPDATE = 3 events
    expect(proj.eventCount).toBe(3);
    expect(proj.lastEventAt).toBe(stackUpdate.timestamp);
  });

  it('totalPotValue equals total chips in play', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(players[0].id, 40),
        makeBuyIn(players[1].id, 40),
      ],
    };
    const proj = projectSession(withEvents);

    expect(proj.totalPotValue).toBe(80);
  });
});
