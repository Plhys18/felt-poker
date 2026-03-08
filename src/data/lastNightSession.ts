/**
 * Demo session: last night's home game (Friday, March 7 2026).
 * 10 players, 23 hands, ~3.5h session.
 * Final results match the actual game report.
 */
import type { Session } from '../types/session';
import type { PlayerId, SessionId, EventId } from '../types/ids';
import type { GameEvent } from '../types/events';
import type { Transfer } from '../types/settlement';

// ---------------------------------------------------------------------------
// Fixed IDs — deterministic so the demo session is always the same
// ---------------------------------------------------------------------------

const SID = 'demo-last-night-2026' as SessionId;

const A = 'demo-p-adiss' as PlayerId;
const N = 'demo-p-nina' as PlayerId;
const B = 'demo-p-baska' as PlayerId;
const P = 'demo-p-plhys' as PlayerId;
const R = 'demo-p-borek' as PlayerId;
const M = 'demo-p-max' as PlayerId;
const K = 'demo-p-klarka' as PlayerId;
const D = 'demo-p-bedna' as PlayerId;
const L = 'demo-p-drlas' as PlayerId;
const Z = 'demo-p-zuggy' as PlayerId;

let _e = 0;
const eid = (): EventId => `demo-e-${String(++_e).padStart(3, '0')}` as EventId;

// Game start: Friday March 7 2026 at 19:30 local
const BASE = new Date('2026-03-07T19:30:00').getTime();
const MIN = 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bi(offsetMin: number, pid: PlayerId, chips: number): GameEvent {
  return { id: eid(), type: 'BUY_IN', timestamp: BASE + offsetMin * MIN, playerId: pid, chipsReceived: chips };
}

// deltas: [playerId, prevStack, newStack][]
function hand(offsetMin: number, deltas: [PlayerId, number, number][]): GameEvent[] {
  const ts = BASE + offsetMin * MIN;
  return deltas.map(([pid, prev, next]) => ({
    id: eid(),
    type: 'STACK_UPDATE' as const,
    timestamp: ts,
    playerId: pid,
    previousStack: prev,
    newStack: next,
  }));
}

// ---------------------------------------------------------------------------
// Settlement transfers (greedy two-pointer on final P&L)
// Creditors: A+527, N+417, B+358, P+192
// Debtors:   Z-450, D-250, L-250, K-215, M-197, R-132
// ---------------------------------------------------------------------------

const transfers: Transfer[] = [
  { from: Z, to: A, amount: 450 },
  { from: D, to: A, amount: 77 },
  { from: D, to: N, amount: 173 },
  { from: L, to: N, amount: 244 },
  { from: L, to: B, amount: 6 },
  { from: K, to: B, amount: 215 },
  { from: M, to: B, amount: 137 },
  { from: M, to: P, amount: 60 },
  { from: R, to: P, amount: 132 },
];

// ---------------------------------------------------------------------------
// Event log
// Stack state at each point (all 10 players) is tracked in comments.
// Chip conservation is verified at every hand.
// ---------------------------------------------------------------------------

const events: GameEvent[] = [
  // ── Game start ──────────────────────────────────────────────────────────
  { id: eid(), type: 'GAME_STARTED', timestamp: BASE },

  // ── Initial buy-ins  (t=0)  pot=1510 ────────────────────────────────────
  // A:150  N:150  B:150  P:160  R:150  M:150  K:150  D:150  L:150  Z:150
  bi(0, A, 150),
  bi(0, N, 150),
  bi(0, B, 150),
  bi(0, P, 160),   // Plhys bought in 160 instead of the standard 150
  bi(0, R, 150),
  bi(0, M, 150),
  bi(0, K, 150),
  bi(0, D, 150),
  bi(0, L, 150),
  bi(0, Z, 150),

  // ── Hand 1  (t=8min)  — Zuggy opens strong ──────────────────────────────
  // Z wins from K and D
  // → A:150  N:150  B:150  P:160  R:150  M:150  K:110  D:110  L:150  Z:230
  ...hand(8, [[Z, 150, 230], [K, 150, 110], [D, 150, 110]]),

  // ── Hand 2  (t=16min)  — Baška takes a nice pot ─────────────────────────
  // B wins from R and M
  // → A:150  N:150  B:210  P:160  R:120  M:120  K:110  D:110  L:150  Z:230
  ...hand(16, [[B, 150, 210], [R, 150, 120], [M, 150, 120]]),

  // ── Hand 3  (t=25min)  — Zuggy crushes the table again ──────────────────
  // Z wins from N and A
  // → A:100  N:100  B:210  P:160  R:120  M:120  K:110  D:110  L:150  Z:330
  ...hand(25, [[Z, 230, 330], [N, 150, 100], [A, 150, 100]]),

  // ── Hand 4  (t=33min)  — Adiss fights back ──────────────────────────────
  // A wins from L and K
  // → A:180  N:100  B:210  P:160  R:120  M:120  K:70  D:110  L:110  Z:330
  ...hand(33, [[A, 100, 180], [L, 150, 110], [K, 110, 70]]),

  // ── Hand 5  (t=42min)  — Baška keeps building ───────────────────────────
  // B wins from D and R
  // → A:180  N:100  B:280  P:160  R:90  M:120  K:70  D:70  L:110  Z:330
  ...hand(42, [[B, 210, 280], [D, 110, 70], [R, 120, 90]]),

  // ── Rebuys after hand 5  (t=45min)  pot: 1510 → 1910 ───────────────────
  // Nina, Klárka and Bedna top up
  bi(45, N, 200),   // N: 100 → 300
  bi(45, K, 100),   // K: 70  → 170
  bi(45, D, 100),   // D: 70  → 170

  // ── Hand 6  (t=53min)  — Zuggy extending the chip lead ──────────────────
  // State after rebuys: A:180  N:300  B:280  P:160  R:90  M:120  K:170  D:170  L:110  Z:330
  // Z wins from M and R
  // → A:180  N:300  B:280  P:160  R:40  M:70  K:170  D:170  L:110  Z:430
  ...hand(53, [[Z, 330, 430], [M, 120, 70], [R, 90, 40]]),

  // ── Hand 7  (t=62min)  — Nina makes a move ──────────────────────────────
  // N wins from L and B
  // → A:180  N:400  B:230  P:160  R:40  M:70  K:170  D:170  L:60  Z:430
  ...hand(62, [[N, 300, 400], [L, 110, 60], [B, 280, 230]]),

  // ── Hand 8  (t=70min)  — Adiss takes a big one ──────────────────────────
  // A wins from K and D
  // → A:300  N:400  B:230  P:160  R:40  M:70  K:110  D:110  L:60  Z:430
  ...hand(70, [[A, 180, 300], [K, 170, 110], [D, 170, 110]]),

  // ── Hand 9  (t=79min)  — Plhys picks up a pot ───────────────────────────
  // P wins from M and Z
  // → A:300  N:400  B:230  P:250  R:40  M:20  K:110  D:110  L:60  Z:390
  ...hand(79, [[P, 160, 250], [M, 70, 20], [Z, 430, 390]]),

  // ── Hand 10  (t=87min)  — Baška recovers ────────────────────────────────
  // B wins from R and L
  // → A:300  N:400  B:300  P:250  R:10  M:20  K:110  D:110  L:20  Z:390
  ...hand(87, [[B, 230, 300], [R, 40, 10], [L, 60, 20]]),

  // ── Rebuys after hand 10  (t=90min)  pot: 1910 → 2460 ──────────────────
  // Max, Adiss and Bořek reload
  bi(90, M, 150),   // M: 20  → 170
  bi(90, A, 150),   // A: 300 → 450
  bi(90, R, 250),   // R: 10  → 260

  // ── Hand 11  (t=98min)  — Adiss takes the chip lead ─────────────────────
  // State after rebuys: A:450  N:400  B:300  P:250  R:260  M:170  K:110  D:110  L:20  Z:390
  // A wins from Z and D
  // → A:550  N:400  B:300  P:250  R:260  M:170  K:110  D:70  L:20  Z:330
  ...hand(98, [[A, 450, 550], [Z, 390, 330], [D, 110, 70]]),

  // ── Hand 12  (t=107min)  — Nina creeps up ───────────────────────────────
  // N wins from K and D
  // → A:550  N:490  B:300  P:250  R:260  M:170  K:60  D:30  L:20  Z:330
  ...hand(107, [[N, 400, 490], [K, 110, 60], [D, 70, 30]]),

  // ── Hand 13  (t=115min)  — Baška back to business ───────────────────────
  // B wins from M and R
  // → A:550  N:490  B:420  P:250  R:200  M:110  K:60  D:30  L:20  Z:330
  ...hand(115, [[B, 300, 420], [M, 170, 110], [R, 260, 200]]),

  // ── Hand 14  (t=124min)  — Bedna and Drlas bust out ─────────────────────
  // Z wins the last of D and L
  // → A:550  N:490  B:420  P:250  R:200  M:110  K:60  D:0  L:0  Z:380
  ...hand(124, [[Z, 330, 380], [D, 30, 0], [L, 20, 0]]),

  // ── Rebuys after hand 14  (t=127min)  pot: 2460 → 2860 ─────────────────
  // Baška and Zuggy both top up; Drlas re-enters
  bi(127, B, 150),   // B: 420 → 570
  bi(127, Z, 150),   // Z: 380 → 530
  bi(127, L, 100),   // L: 0   → 100  (Drlas re-enters)

  // ── Hand 15  (t=135min)  — Adiss asserts dominance ──────────────────────
  // State after rebuys: A:550  N:490  B:570  P:250  R:200  M:110  K:60  D:0  L:100  Z:530
  // A wins from Z and R
  // → A:650  N:490  B:570  P:250  R:160  M:110  K:60  D:0  L:100  Z:470
  ...hand(135, [[A, 550, 650], [Z, 530, 470], [R, 200, 160]]),

  // ── Hand 16  (t=144min)  — Nina keeps climbing ───────────────────────────
  // N wins from Z and K
  // → A:650  N:570  B:570  P:250  R:160  M:110  K:30  D:0  L:100  Z:420
  ...hand(144, [[N, 490, 570], [Z, 470, 420], [K, 60, 30]]),

  // ── Hand 17  (t=153min)  — Baška scoops a big pot ───────────────────────
  // B wins from M and Z
  // → A:650  N:570  B:650  P:250  R:160  M:70  K:30  D:0  L:100  Z:380
  ...hand(153, [[B, 570, 650], [M, 110, 70], [Z, 420, 380]]),

  // ── Hand 18  (t=162min)  — Plhys picks up chips ─────────────────────────
  // P wins from L and R
  // → A:650  N:570  B:650  P:320  R:140  M:70  K:30  D:0  L:50  Z:380
  ...hand(162, [[P, 250, 320], [L, 100, 50], [R, 160, 140]]),

  // ── Hand 19  (t=170min)  — Adiss and Nina both score ────────────────────
  // A and N share a pot off Zuggy
  // → A:700  N:610  B:650  P:320  R:140  M:70  K:30  D:0  L:50  Z:290
  ...hand(170, [[A, 650, 700], [N, 570, 610], [Z, 380, 290]]),

  // ── Zuggy's last rebuy  (t=173min)  pot: 2860 → 3010 ───────────────────
  bi(173, Z, 150),   // Z: 290 → 440

  // ── Hand 20  (t=181min)  — Late-game pressure ───────────────────────────
  // State after rebuy: A:700  N:610  B:650  P:320  R:140  M:70  K:30  D:0  L:50  Z:440
  // A, N, B all take from Z and L
  // → A:760  N:690  B:690  P:320  R:140  M:70  K:30  D:0  L:0  Z:310
  ...hand(181, [[A, 700, 760], [N, 610, 690], [B, 650, 690], [Z, 440, 310], [L, 50, 0]]),

  // ── Hand 21  (t=190min)  — The top four pull away ───────────────────────
  // B and R win, Zuggy and Klárka pay the price
  // → A:760  N:690  B:740  P:310  R:220  M:70  K:10  D:0  L:0  Z:210
  ...hand(190, [[B, 690, 740], [R, 140, 220], [Z, 310, 210], [K, 30, 10], [P, 320, 310]]),

  // ── Hand 22  (t=198min)  — Zuggy goes all-in and loses ──────────────────
  // A, N, P, R split Zuggy's last 210
  // → A:825  N:755  B:740  P:340  R:270  M:70  K:10  D:0  L:0  Z:0
  ...hand(198, [[A, 760, 825], [N, 690, 755], [P, 310, 340], [R, 220, 270], [Z, 210, 0]]),

  // ── Hand 23  (t=207min)  — Final hand of the night ──────────────────────
  // Last redistribution as people start cashing out
  // → A:827  N:767  B:658  P:352  R:268  M:103  K:35  D:0  L:0  Z:0
  ...hand(207, [
    [A, 825, 827],
    [N, 755, 767],
    [B, 740, 658],
    [P, 340, 352],
    [R, 270, 268],
    [M, 70, 103],
    [K, 10, 35],
  ]),

  // ── Session settled  (t=210min) ─────────────────────────────────────────
  {
    id: eid(),
    type: 'SESSION_SETTLED',
    timestamp: BASE + 210 * MIN,
    transfers,
  },
];

// ---------------------------------------------------------------------------
// Exported session
// ---------------------------------------------------------------------------

export const lastNightSession: Session = {
  schemaVersion: 3,
  config: {
    id: SID,
    name: "Friday Night Felt",
    defaultBuyIn: 150,
    createdAt: BASE,
  },
  players: [
    { id: A, name: 'Adiss',  seatIndex: 0 },
    { id: N, name: 'Nina',   seatIndex: 1 },
    { id: B, name: 'Baška',  seatIndex: 2 },
    { id: P, name: 'Plhys',  seatIndex: 3 },
    { id: R, name: 'Bořek',  seatIndex: 4 },
    { id: M, name: 'Max',    seatIndex: 5 },
    { id: K, name: 'Klárka', seatIndex: 6 },
    { id: D, name: 'Bedna',  seatIndex: 7 },
    { id: L, name: 'Drlas',  seatIndex: 8 },
    { id: Z, name: 'Zuggy',  seatIndex: 9 },
  ],
  events,
  status: 'settled',
  endedAt: BASE + 210 * MIN,
};
