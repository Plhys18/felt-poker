import { describe, it, expect } from 'vitest';
import { computeSettlement } from '../../src/engine/settlement';
import { projectSession } from '../../src/engine/projection';
import { makeSession, makePlayer, makeBuyIn, makeStackUpdate } from '../helpers';

function buildProjection(playerDefs: Array<{ name: string; buyIn: number; finalStack: number }>) {
  const players = playerDefs.map((p, i) => makePlayer(p.name, i));
  const session = makeSession(players);
  const events = [
    ...session.events,
    ...playerDefs.flatMap((p, i) => [
      makeBuyIn(players[i].id, p.buyIn),
      makeStackUpdate(players[i].id, p.buyIn, p.finalStack),
    ]),
  ];
  return { session: { ...session, events }, projection: projectSession({ ...session, events }) };
}

describe('computeSettlement', () => {
  it('produces zero transfers when all break even', () => {
    const { session, projection } = buildProjection([
      { name: 'Alice', buyIn: 20, finalStack: 20 },
      { name: 'Bob', buyIn: 20, finalStack: 20 },
    ]);
    const result = computeSettlement(projection, session.config);
    expect(result.transfers).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('one debtor pays one creditor', () => {
    const { session, projection } = buildProjection([
      { name: 'Alice', buyIn: 20, finalStack: 30 }, // +10
      { name: 'Bob', buyIn: 20, finalStack: 10 },   // -10
    ]);
    const result = computeSettlement(projection, session.config);
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0].amount).toBe(10);
    expect(result.isValid).toBe(true);
  });

  it('classic 4-player scenario: Alice+30 Bob-10 Carol-15 Dave-5', () => {
    const { session, projection } = buildProjection([
      { name: 'Alice', buyIn: 20, finalStack: 50 }, // +30
      { name: 'Bob',   buyIn: 20, finalStack: 10 }, // -10
      { name: 'Carol', buyIn: 20, finalStack: 5  }, // -15
      { name: 'Dave',  buyIn: 20, finalStack: 15 }, // -5
    ]);
    const result = computeSettlement(projection, session.config);
    // Maximum 3 transfers (n-1)
    expect(result.transfers.length).toBeLessThanOrEqual(3);
    expect(result.isValid).toBe(true);
    // Total amount transferred equals total winnings
    const totalPaid = result.transfers.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBeCloseTo(30);
  });

  it('isValid is true when pot balances', () => {
    const { session, projection } = buildProjection([
      { name: 'Alice', buyIn: 20, finalStack: 40 },
      { name: 'Bob', buyIn: 20, finalStack: 0 },
    ]);
    const result = computeSettlement(projection, session.config);
    expect(result.isValid).toBe(true);
  });

  // --- New tests ---

  it('two creditors, one debtor: Alice+20 Bob+10 Carol-30 → Carol pays each', () => {
    const { session, projection } = buildProjection([
      { name: 'Alice', buyIn: 20, finalStack: 40 }, // +20
      { name: 'Bob',   buyIn: 20, finalStack: 30 }, // +10
      { name: 'Carol', buyIn: 20, finalStack: 0  }, // -30 (wait, 20+10+30=60, but Carol starts 20, ends 0 = -20... let me fix)
    ]);
    // Alice+20, Bob+10, Carol-30: total=0 ✓
    // The buildProjection uses finalStack - buyIn as PnL since chipDenomination=1
    // Alice: 40-20=+20, Bob: 30-20=+10, Carol: 0-30 (needs Carol buyIn=30)
    // Re-do with correct values: Alice +20, Bob +10, Carol -30
    const players2 = [makePlayer('Alice2', 0), makePlayer('Bob2', 1), makePlayer('Carol2', 2)];
    const session2 = makeSession(players2);
    const events2 = [
      ...session2.events,
      makeBuyIn(players2[0].id, 20),  // Alice buys in 20
      makeBuyIn(players2[1].id, 20),  // Bob buys in 20
      makeBuyIn(players2[2].id, 30),  // Carol buys in 30
      makeStackUpdate(players2[0].id, 20, 40), // Alice ends 40 → +20
      makeStackUpdate(players2[1].id, 20, 30), // Bob ends 30 → +10
      makeStackUpdate(players2[2].id, 30, 0),  // Carol ends 0 → -30
    ];
    const proj2 = projectSession({ ...session2, events: events2 });
    const result = computeSettlement(proj2, session2.config);

    expect(result.isValid).toBe(true);
    // Carol (-30) must pay Alice (+20) and Bob (+10) → 2 transfers
    expect(result.transfers).toHaveLength(2);
    const totalPaid = result.transfers.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBeCloseTo(30);
    // Each transfer is from Carol to one of the creditors
    const carolId = players2[2].id;
    expect(result.transfers.every((t) => t.from === carolId)).toBe(true);
  });

  it('one creditor, many small debtors: Alice+40 Bob-10 Carol-15 Dave-10 Eve-5', () => {
    const players = [
      makePlayer('Alice', 0),
      makePlayer('Bob',   1),
      makePlayer('Carol', 2),
      makePlayer('Dave',  3),
      makePlayer('Eve',   4),
    ];
    const session = makeSession(players);
    const events = [
      ...session.events,
      makeBuyIn(players[0].id, 20),
      makeBuyIn(players[1].id, 20),
      makeBuyIn(players[2].id, 20),
      makeBuyIn(players[3].id, 20),
      makeBuyIn(players[4].id, 20),
      makeStackUpdate(players[0].id, 20, 60), // Alice +40
      makeStackUpdate(players[1].id, 20, 10), // Bob -10
      makeStackUpdate(players[2].id, 20, 5),  // Carol -15
      makeStackUpdate(players[3].id, 20, 10), // Dave -10
      makeStackUpdate(players[4].id, 20, 15), // Eve -5
    ];
    const proj = projectSession({ ...session, events });
    const result = computeSettlement(proj, session.config);

    expect(result.isValid).toBe(true);
    // One creditor → exactly 4 transfers (one per debtor)
    expect(result.transfers).toHaveLength(4);
    const totalPaid = result.transfers.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBeCloseTo(40);
    // All transfers go to Alice
    const aliceId = players[0].id;
    expect(result.transfers.every((t) => t.to === aliceId)).toBe(true);
  });

  it('all players break even: no transfers needed', () => {
    const { session, projection } = buildProjection([
      { name: 'Alice', buyIn: 20, finalStack: 20 },
      { name: 'Bob',   buyIn: 30, finalStack: 30 },
      { name: 'Carol', buyIn: 15, finalStack: 15 },
    ]);
    const result = computeSettlement(projection, session.config);
    expect(result.transfers).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('very unequal: one winner, three losers → exactly 3 transfers', () => {
    const { session, projection } = buildProjection([
      { name: 'Alice', buyIn: 20, finalStack: 110 }, // +90
      { name: 'Bob',   buyIn: 20, finalStack: 0 },   // -20... wait, need balanced total
      // Alice+90, B-30, C-30, D-30
    ]);
    const players2 = [
      makePlayer('Alice', 0),
      makePlayer('Bob',   1),
      makePlayer('Carol', 2),
      makePlayer('Dave',  3),
    ];
    const session2 = makeSession(players2);
    const events2 = [
      ...session2.events,
      makeBuyIn(players2[0].id, 20),
      makeBuyIn(players2[1].id, 20),
      makeBuyIn(players2[2].id, 20),
      makeBuyIn(players2[3].id, 20),
      makeStackUpdate(players2[0].id, 20, 110), // Alice +90
      makeStackUpdate(players2[1].id, 20, 0),   // Bob -20 (not -30... let me use 50 total in, Alice+90, others 3×-30)
    ];
    // Actually use separate buyIn amounts: Alice 20, others 30 each → total=110
    // Alice ends 110 (+90), each other ends 0 (-30). 20+30+30+30=110. ✓
    const players3 = [
      makePlayer('Alice', 0),
      makePlayer('Bob',   1),
      makePlayer('Carol', 2),
      makePlayer('Dave',  3),
    ];
    const session3 = makeSession(players3);
    const events3 = [
      ...session3.events,
      makeBuyIn(players3[0].id, 20),
      makeBuyIn(players3[1].id, 30),
      makeBuyIn(players3[2].id, 30),
      makeBuyIn(players3[3].id, 30),
      makeStackUpdate(players3[0].id, 20, 110), // Alice +90
      makeStackUpdate(players3[1].id, 30, 0),   // Bob -30
      makeStackUpdate(players3[2].id, 30, 0),   // Carol -30
      makeStackUpdate(players3[3].id, 30, 0),   // Dave -30
    ];
    const proj3 = projectSession({ ...session3, events: events3 });
    const result3 = computeSettlement(proj3, session3.config);

    expect(result3.isValid).toBe(true);
    expect(result3.transfers).toHaveLength(3);
    const totalPaid = result3.transfers.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBeCloseTo(90);
  });

  it('rounding: transfer amounts are whole chip numbers', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1), makePlayer('Carol', 2)];
    const session = makeSession(players);
    const events = [
      ...session.events,
      makeBuyIn(players[0].id, 30),
      makeBuyIn(players[1].id, 30),
      makeBuyIn(players[2].id, 30),
      makeStackUpdate(players[0].id, 30, 40), // +10
      makeStackUpdate(players[1].id, 30, 25), // -5
      makeStackUpdate(players[2].id, 30, 25), // -5
    ];
    const proj = projectSession({ ...session, events });
    const result = computeSettlement(proj, session.config);

    expect(result.isValid).toBe(true);
    result.transfers.forEach((t) => {
      expect(typeof t.amount).toBe('number');
      expect(isNaN(t.amount)).toBe(false);
      expect(t.amount % 1).toBe(0); // whole chips
    });
  });

  it('isValid is false when balances do not sum to zero (chip integrity failure)', () => {
    // Manually construct a projection where netProfitLoss values don't sum to zero
    const players2 = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session2 = makeSession(players2);
    // Normal buy-in that balances
    const events = [
      ...session2.events,
      makeBuyIn(players2[0].id, 20),
      makeBuyIn(players2[1].id, 20),
      // Bob ends up with 50 — 10 extra chips appeared from nowhere
      makeStackUpdate(players2[1].id, 20, 50),
    ];
    const proj = projectSession({ ...session2, events });
    // At this point Alice=20 (net 0), Bob=50 (net +30). Sum=+30 ≠ 0 → isValid=false
    const result = computeSettlement(proj, session2.config);
    expect(result.isValid).toBe(false);
  });
});
