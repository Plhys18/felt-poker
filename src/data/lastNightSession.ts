/**
 * Demo session: last Friday's home game (March 7 2026).
 * 10 players · 35 hands · ~4h · all final results match the actual game report.
 */
import type { Session } from '../types/session';
import type { PlayerId, SessionId, EventId } from '../types/ids';
import type { GameEvent } from '../types/events';
import type { Transfer } from '../types/settlement';

// ---------------------------------------------------------------------------
// Fixed IDs
// ---------------------------------------------------------------------------

const SID = 'demo-last-night-2026' as SessionId;

const A = 'demo-p-adiss' as PlayerId;
const N = 'demo-p-nina'  as PlayerId;
const B = 'demo-p-baska' as PlayerId;
const P = 'demo-p-plhys' as PlayerId;
const R = 'demo-p-borek' as PlayerId;
const M = 'demo-p-max'   as PlayerId;
const K = 'demo-p-klarka' as PlayerId;
const D = 'demo-p-bedna' as PlayerId;
const L = 'demo-p-drlas' as PlayerId;
const Z = 'demo-p-zuggy' as PlayerId;

let _e = 0;
const eid = (): EventId => `demo-e-${String(++_e).padStart(3, '0')}` as EventId;

const BASE = new Date('2026-03-07T19:30:00').getTime();
const MIN  = 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bi(t: number, pid: PlayerId, chips: number): GameEvent {
  return { id: eid(), type: 'BUY_IN', timestamp: BASE + t * MIN, playerId: pid, chipsReceived: chips };
}

// [playerId, prevStack, newStack]
function hand(t: number, deltas: [PlayerId, number, number][]): GameEvent[] {
  return deltas.map(([pid, prev, next]) => ({
    id: eid(), type: 'STACK_UPDATE' as const,
    timestamp: BASE + t * MIN, playerId: pid, previousStack: prev, newStack: next,
  }));
}

// ---------------------------------------------------------------------------
// Settlement transfers  (creditors: A+527, N+417, B+358, P+192)
//                       (debtors:   Z-450, D-250, L-250, K-215, M-197, R-132)
// ---------------------------------------------------------------------------

const transfers: Transfer[] = [
  { from: Z, to: A, amount: 450 },
  { from: D, to: A, amount:  77 },
  { from: D, to: N, amount: 173 },
  { from: L, to: N, amount: 244 },
  { from: L, to: B, amount:   6 },
  { from: K, to: B, amount: 215 },
  { from: M, to: B, amount: 137 },
  { from: M, to: P, amount:  60 },
  { from: R, to: P, amount: 132 },
];

// ---------------------------------------------------------------------------
// Full event log  (chip conservation verified at every hand)
//
// State notation:  A  N   B   P   R   M   K   D   L   Z  = total
// ---------------------------------------------------------------------------

const events: GameEvent[] = [
  { id: eid(), type: 'GAME_STARTED', timestamp: BASE },

  // ── Initial buy-ins  t=0  pot=1510 ──────────────────────────────────────
  // A:150 N:150 B:150 P:160 R:150 M:150 K:150 D:150 L:150 Z:150
  bi(0, A, 150), bi(0, N, 150), bi(0, B, 150), bi(0, P, 160),
  bi(0, R, 150), bi(0, M, 150), bi(0, K, 150), bi(0, D, 150),
  bi(0, L, 150), bi(0, Z, 150),

  // ── H1  t=6  — Zuggy opens with a steal ─────────────────────────────────
  // → A:150 N:150 B:150 P:160 R:150 M:150 K:130 D:130 L:150 Z:190
  ...hand(6, [[Z, 150, 190], [K, 150, 130], [D, 150, 130]]),

  // ── H2  t=12  — Baška picks up a pot ────────────────────────────────────
  // → A:150 N:150 B:190 P:160 R:130 M:130 K:130 D:130 L:150 Z:190
  ...hand(12, [[B, 150, 190], [R, 150, 130], [M, 150, 130]]),

  // ── H3  t=19  — Zuggy 3-bets and takes it down ──────────────────────────
  // → A:100 N:100 B:190 P:160 R:130 M:130 K:130 D:130 L:150 Z:290
  ...hand(19, [[Z, 190, 290], [N, 150, 100], [A, 150, 100]]),

  // ── H4  t=25  — Adiss fights back ───────────────────────────────────────
  // → A:170 N:100 B:190 P:160 R:130 M:130 K:100 D:130 L:110 Z:290
  ...hand(25, [[A, 100, 170], [L, 150, 110], [K, 130, 100]]),

  // ── H5  t=32  — Baška scoops a multi-way pot ────────────────────────────
  // → A:170 N:100 B:250 P:160 R:100 M:130 K:100 D:100 L:110 Z:290
  ...hand(32, [[B, 190, 250], [D, 130, 100], [R, 130, 100]]),

  // ── H6  t=38  — Zuggy keeps building ────────────────────────────────────
  // → A:170 N:100 B:250 P:160 R:85 M:105 K:100 D:100 L:110 Z:330
  ...hand(38, [[Z, 290, 330], [M, 130, 105], [R, 100, 85]]),

  // ── H7  t=44  — Adiss takes one from Nina and Bedna ─────────────────────
  // → A:200 N:85 B:250 P:160 R:85 M:105 K:100 D:85 L:110 Z:330
  ...hand(44, [[A, 170, 200], [N, 100, 85], [D, 100, 85]]),

  // ── H8  t=51  — Nina bounces back; Klárka and Bedna pay ─────────────────
  // → A:180 N:100 B:280 P:160 R:90 M:120 K:70 D:70 L:110 Z:330
  ...hand(51, [
    [A, 200, 180], [N, 85, 100], [B, 250, 280],
    [R, 85, 90], [M, 105, 120], [K, 100, 70], [D, 85, 70],
  ]),

  // ── Rebuys after H8  t=54  pot: 1510 → 1910 ────────────────────────────
  // Nina, Klárka, Bedna reload
  bi(54, N, 200), bi(54, K, 100), bi(54, D, 100),
  // A:180 N:300 B:280 P:160 R:90 M:120 K:170 D:170 L:110 Z:330

  // ── H9  t=60  — Zuggy crushes the short stacks ──────────────────────────
  // → A:180 N:300 B:280 P:160 R:50 M:80 K:170 D:170 L:110 Z:410
  ...hand(60, [[Z, 330, 410], [M, 120, 80], [R, 90, 50]]),

  // ── H10  t=66  — Nina takes a big one from Baška and Drlas ──────────────
  // → A:180 N:380 B:245 P:160 R:50 M:80 K:170 D:170 L:65 Z:410
  ...hand(66, [[N, 300, 380], [L, 110, 65], [B, 280, 245]]),

  // ── H11  t=73  — Adiss pots it against Klárka and Bedna ─────────────────
  // → A:280 N:380 B:245 P:160 R:50 M:80 K:115 D:125 L:65 Z:410
  ...hand(73, [[A, 180, 280], [K, 170, 115], [D, 170, 125]]),

  // ── H12  t=79  — Plhys takes a pot from Max and Zuggy ───────────────────
  // → A:280 N:380 B:245 P:230 R:50 M:40 K:115 D:125 L:65 Z:380
  ...hand(79, [[P, 160, 230], [M, 80, 40], [Z, 410, 380]]),

  // ── H13  t=85  — Baška rebuilds off Bořek and Drlas ─────────────────────
  // → A:280 N:380 B:305 P:230 R:20 M:40 K:115 D:125 L:35 Z:380
  ...hand(85, [[B, 245, 305], [R, 50, 20], [L, 65, 35]]),

  // ── H14  t=92  — Nina extends the lead ──────────────────────────────────
  // → A:280 N:430 B:305 P:230 R:20 M:40 K:90 D:100 L:35 Z:380
  ...hand(92, [[N, 380, 430], [K, 115, 90], [D, 125, 100]]),

  // ── H15  t=98  — Chaotic pot; whole table involved ──────────────────────
  // → A:300 N:400 B:300 P:250 R:10 M:20 K:110 D:110 L:20 Z:390
  ...hand(98, [
    [A, 280, 300], [N, 430, 400], [B, 305, 300],
    [P, 230, 250], [R, 20, 10],   [M, 40, 20],
    [K, 90, 110],  [D, 100, 110], [L, 35, 20], [Z, 380, 390],
  ]),

  // ── Rebuys after H15  t=101  pot: 1910 → 2460 ───────────────────────────
  // Max, Adiss and Bořek reload
  bi(101, M, 150), bi(101, A, 150), bi(101, R, 250),
  // A:450 N:400 B:300 P:250 R:260 M:170 K:110 D:110 L:20 Z:390

  // ── H16  t=107  — Adiss asserts himself ──────────────────────────────────
  // → A:530 N:400 B:300 P:250 R:260 M:170 K:110 D:80 L:20 Z:340
  ...hand(107, [[A, 450, 530], [Z, 390, 340], [D, 110, 80]]),

  // ── H17  t=113  — Nina creeps up ─────────────────────────────────────────
  // → A:530 N:470 B:300 P:250 R:260 M:170 K:70 D:50 L:20 Z:340
  ...hand(113, [[N, 400, 470], [K, 110, 70], [D, 80, 50]]),

  // ── H18  t=120  — Baška scoops a big pot ─────────────────────────────────
  // → A:530 N:470 B:400 P:250 R:215 M:115 K:70 D:50 L:20 Z:340
  ...hand(120, [[B, 300, 400], [M, 170, 115], [R, 260, 215]]),

  // ── H19  t=126  — Zuggy takes the last of Drlas ──────────────────────────
  // → A:530 N:470 B:400 P:250 R:215 M:115 K:70 D:20 L:0 Z:390
  ...hand(126, [[Z, 340, 390], [D, 50, 20], [L, 20, 0]]),

  // ── H20  t=132  — Adiss pots it vs Zuggy and Bořek ───────────────────────
  // → A:580 N:470 B:400 P:250 R:195 M:115 K:70 D:20 L:0 Z:360
  ...hand(132, [[A, 530, 580], [Z, 390, 360], [R, 215, 195]]),

  // ── H21  t=139  — Nina takes from Klárka and Zuggy ───────────────────────
  // → A:580 N:520 B:400 P:250 R:195 M:115 K:40 D:20 L:0 Z:340
  ...hand(139, [[N, 470, 520], [K, 70, 40], [Z, 360, 340]]),

  // ── H22  t=145  — Zuggy recovers; Adiss gives some back ──────────────────
  // → A:550 N:490 B:420 P:250 R:200 M:110 K:60 D:0 L:0 Z:380
  ...hand(145, [
    [A, 580, 550], [N, 520, 490], [B, 400, 420],
    [R, 195, 200], [M, 115, 110], [K, 40, 60], [D, 20, 0], [Z, 340, 380],
  ]),

  // ── Rebuys after H22  t=148  pot: 2460 → 2860 ────────────────────────────
  // Baška tops up; Zuggy rebuys; Drlas re-enters
  bi(148, B, 150), bi(148, Z, 150), bi(148, L, 100),
  // A:550 N:490 B:570 P:250 R:200 M:110 K:60 D:0 L:100 Z:530

  // ── H23  t=154  — Adiss dominates; Zuggy and Bořek bleed ─────────────────
  // → A:640 N:490 B:570 P:250 R:165 M:110 K:60 D:0 L:100 Z:475
  ...hand(154, [[A, 550, 640], [Z, 530, 475], [R, 200, 165]]),

  // ── H24  t=160  — Nina builds on Zuggy and Klárka ────────────────────────
  // → A:640 N:560 B:570 P:250 R:165 M:110 K:35 D:0 L:100 Z:430
  ...hand(160, [[N, 490, 560], [Z, 475, 430], [K, 60, 35]]),

  // ── H25  t=167  — Baška scoops a monster ─────────────────────────────────
  // → A:640 N:560 B:650 P:250 R:165 M:65 K:35 D:0 L:100 Z:395
  ...hand(167, [[B, 570, 650], [M, 110, 65], [Z, 430, 395]]),

  // ── H26  t=173  — Plhys quietly picks up chips ───────────────────────────
  // → A:640 N:560 B:650 P:310 R:150 M:65 K:35 D:0 L:55 Z:395
  ...hand(173, [[P, 250, 310], [L, 100, 55], [R, 165, 150]]),

  // ── H27  t=179  — Adiss continues to chip up ─────────────────────────────
  // → A:695 N:560 B:650 P:310 R:150 M:65 K:25 D:0 L:55 Z:350
  ...hand(179, [[A, 640, 695], [Z, 395, 350], [K, 35, 25]]),

  // ── H28  t=185  — Nina takes from Zuggy and Drlas ────────────────────────
  // → A:695 N:620 B:650 P:310 R:150 M:65 K:25 D:0 L:35 Z:310
  ...hand(185, [[N, 560, 620], [Z, 350, 310], [L, 55, 35]]),

  // ── H29  t=192  — Final shuffle before last rebuy ────────────────────────
  // → A:700 N:610 B:650 P:320 R:140 M:70 K:30 D:0 L:50 Z:290
  ...hand(192, [
    [A, 695, 700], [N, 620, 610],
    [P, 310, 320], [R, 150, 140], [M, 65, 70], [K, 25, 30], [L, 35, 50], [Z, 310, 290],
  ]),

  // ── Zuggy's last stand rebuy  t=195  pot: 2860 → 3010 ────────────────────
  bi(195, Z, 150),
  // A:700 N:610 B:650 P:320 R:140 M:70 K:30 D:0 L:50 Z:440

  // ── H30  t=201  — Adiss and Nina pile on Zuggy ───────────────────────────
  // → A:750 N:670 B:650 P:320 R:140 M:70 K:30 D:0 L:20 Z:360
  ...hand(201, [[A, 700, 750], [N, 610, 670], [Z, 440, 360], [L, 50, 20]]),

  // ── H31  t=207  — Baška and Bořek surge; Zuggy and Drlas pay ─────────────
  // → A:750 N:670 B:700 P:320 R:200 M:70 K:20 D:0 L:0 Z:280
  ...hand(207, [[B, 650, 700], [R, 140, 200], [Z, 360, 280], [L, 20, 0], [K, 30, 20]]),

  // ── H32  t=214  — Adiss and Nina both hit ────────────────────────────────
  // → A:815 N:735 B:700 P:320 R:200 M:70 K:20 D:0 L:0 Z:150
  ...hand(214, [[A, 750, 815], [N, 670, 735], [Z, 280, 150]]),

  // ── H33  t=220  — Plhys and Bořek drag a side pot off Zuggy ──────────────
  // → A:815 N:735 B:700 P:350 R:260 M:70 K:20 D:0 L:0 Z:60
  ...hand(220, [[P, 320, 350], [R, 200, 260], [Z, 150, 60]]),

  // ── H34  t=226  — Zuggy shoves his last 60, table splits it ─────────────
  // → A:823 N:745 B:710 P:355 R:268 M:80 K:29 D:0 L:0 Z:0
  ...hand(226, [
    [A, 815, 823], [N, 735, 745], [B, 700, 710],
    [P, 350, 355], [R, 260, 268], [M, 70, 80], [K, 20, 29], [Z, 60, 0],
  ]),

  // ── H35  t=232  — Last hand of the night (Baška gives some back) ─────────
  // → A:827 N:767 B:658 P:352 R:268 M:103 K:35 D:0 L:0 Z:0
  ...hand(232, [
    [A, 823, 827], [N, 745, 767], [B, 710, 658],
    [P, 355, 352], [M, 80, 103], [K, 29, 35],
  ]),

  // ── Session settled  t=235 ──────────────────────────────────────────────
  { id: eid(), type: 'SESSION_SETTLED', timestamp: BASE + 235 * MIN, transfers },
];

// ---------------------------------------------------------------------------
// Exported session
// ---------------------------------------------------------------------------

export const lastNightSession: Session = {
  schemaVersion: 3,
  config: {
    id: SID,
    name: 'Friday Night Felt',
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
  endedAt: BASE + 235 * MIN,
};
