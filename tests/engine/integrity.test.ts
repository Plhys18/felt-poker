import { describe, it, expect } from 'vitest';
import { computeIntegrity } from '../../src/engine/integrity';
import { projectSession } from '../../src/engine/projection';
import { makeSession, makePlayer, makeBuyIn, makeStackUpdate } from '../helpers';
import { newEventId } from '../../src/types/ids';
import type { CashOutEvent, RejoinEvent } from '../../src/types/events';

describe('computeIntegrity', () => {
  it('is balanced when stack matches buy-in', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(players[0].id, 20, 20),
        makeBuyIn(players[1].id, 20, 20),
      ],
    };
    const proj = projectSession(withEvents);
    const report = computeIntegrity(withEvents.events, proj.playersByPosition);
    expect(report.isBalanced).toBe(true);
    expect(report.difference).toBe(0);
    expect(report.totalChipsIssued).toBe(40);
    expect(report.totalChipsInPlay).toBe(40);
  });

  it('detects imbalance after incorrect stack update', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(players[0].id, 20, 20),
        makeBuyIn(players[1].id, 20, 20),
        // Alice now has 30 but chips didn't come from anywhere — imbalance
        makeStackUpdate(players[0].id, 20, 30),
      ],
    };
    const proj = projectSession(withEvents);
    const report = computeIntegrity(withEvents.events, proj.playersByPosition);
    expect(report.isBalanced).toBe(false);
    expect(report.difference).toBe(-10); // issued=40, inPlay=50, diff=-10
  });

  // --- New tests ---

  it('multiple rebuys: integrity holds when player rebuys', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const alice = players[0];
    const bob = players[1];

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(alice.id, 20, 20),  // Alice first buy-in: 20 chips
        makeBuyIn(alice.id, 20, 20),  // Alice rebuy: +20 chips (total issued=40 for Alice)
        makeBuyIn(alice.id, 20, 20),  // Alice rebuy: +20 chips (total issued=60 for Alice)
        makeBuyIn(bob.id,   20, 20),  // Bob: 20 chips
      ],
    };
    const proj = projectSession(withEvents);
    const report = computeIntegrity(withEvents.events, proj.playersByPosition);

    // totalChipsIssued = 60 + 20 = 80; Alice stack=60, Bob stack=20 → inPlay=80
    expect(report.totalChipsIssued).toBe(80);
    expect(report.totalChipsInPlay).toBe(80);
    expect(report.isBalanced).toBe(true);
    expect(report.difference).toBe(0);
  });

  it('cash out does not break integrity (chips stay at cashOutStack)', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const alice = players[0];
    const bob = players[1];

    const cashOutEvent: CashOutEvent = {
      id: newEventId(),
      type: 'CASH_OUT',
      timestamp: Date.now(),
      playerId: alice.id,
      finalStack: 25,
    };

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(alice.id, 20, 20),
        makeBuyIn(bob.id,   20, 20),
        makeStackUpdate(alice.id, 20, 25), // Alice wins 5 from Bob
        makeStackUpdate(bob.id,   20, 15), // Bob loses 5
        cashOutEvent,                       // Alice cashes out at 25
      ],
    };
    const proj = projectSession(withEvents);
    const report = computeIntegrity(withEvents.events, proj.playersByPosition);

    // totalChipsIssued = 40; Alice cashOutStack=25, Bob currentStack=15 → inPlay=40
    expect(report.totalChipsIssued).toBe(40);
    expect(report.totalChipsInPlay).toBe(40);
    expect(report.isBalanced).toBe(true);
  });

  it('after rejoin: integrity still holds', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const alice = players[0];
    const bob = players[1];

    const cashOutEvent: CashOutEvent = {
      id: newEventId(),
      type: 'CASH_OUT',
      timestamp: Date.now(),
      playerId: alice.id,
      finalStack: 20,
    };
    const rejoinEvent: RejoinEvent = {
      id: newEventId(),
      type: 'REJOIN',
      timestamp: Date.now(),
      playerId: alice.id,
      stack: 20,
    };

    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(alice.id, 20, 20),
        makeBuyIn(bob.id,   20, 20),
        cashOutEvent,   // Alice cashes out at 20
        rejoinEvent,    // Alice rejoins at 20
      ],
    };
    const proj = projectSession(withEvents);
    const report = computeIntegrity(withEvents.events, proj.playersByPosition);

    // Chips issued: 40; Alice currentStack=20 (post-rejoin), Bob=20 → inPlay=40
    expect(report.isBalanced).toBe(true);
    expect(report.totalChipsIssued).toBe(40);
    expect(report.totalChipsInPlay).toBe(40);
  });

  it('empty session (no buy-ins): isBalanced=true, both totals=0', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    // Only GAME_STARTED event, no buy-ins
    const proj = projectSession(session);
    const report = computeIntegrity(session.events, proj.playersByPosition);

    expect(report.isBalanced).toBe(true);
    expect(report.totalChipsIssued).toBe(0);
    expect(report.totalChipsInPlay).toBe(0);
    expect(report.difference).toBe(0);
  });
});
