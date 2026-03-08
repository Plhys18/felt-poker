export const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'] as const;
export const SUITS = ['♠','♥','♦','♣'] as const;

export type Rank = typeof RANKS[number];
export type Suit = typeof SUITS[number];
export interface Card { rank: Rank; suit: Suit }

export const RANK_VALUE: Record<Rank, number> = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14,
};

export const RANK_LABEL: Record<Rank, string> = {
  '2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','T':'10','J':'J','Q':'Q','K':'K','A':'A',
};

export const SUIT_COLOR: Record<Suit, string> = {
  '♠':'text-white','♥':'text-red-400','♦':'text-red-400','♣':'text-white',
};

export type HandRank =
  | 'Royal Flush' | 'Straight Flush' | 'Four of a Kind'
  | 'Full House' | 'Flush' | 'Straight'
  | 'Three of a Kind' | 'Two Pair' | 'One Pair' | 'High Card';

export interface HandResult {
  rank: HandRank;
  score: number; // higher = better, for comparison
  label: string; // e.g. "Full House, Kings full of Aces"
}

export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length !== 5) throw new Error('Need exactly 5 cards');

  const vals = cards.map(c => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const counts: Record<number, number> = {};
  for (const v of vals) counts[v] = (counts[v] ?? 0) + 1;

  const isFlush = new Set(suits).size === 1;
  const sortedUniq = [...new Set(vals)].sort((a, b) => b - a);

  // Check straight (including A-2-3-4-5 wheel)
  let isStraight = false;
  let straightHigh = 0;
  if (sortedUniq.length === 5) {
    if (sortedUniq[0] - sortedUniq[4] === 4) {
      isStraight = true;
      straightHigh = sortedUniq[0];
    } else if (
      sortedUniq[0] === 14 &&
      sortedUniq[1] === 5 &&
      sortedUniq[2] === 4 &&
      sortedUniq[3] === 3 &&
      sortedUniq[4] === 2
    ) {
      // Wheel: A-2-3-4-5 (Ace plays low)
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Group by count: [[count, value], ...]
  const groups = Object.entries(counts)
    .map(([v, c]) => [c, Number(v)] as [number, number])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);

  const [topCount, topVal] = groups[0];
  const [secCount, secVal] = groups[1] ?? [0, 0];

  // Fixed-depth mixed-radix score: always exactly 5 tiebreaker positions (padded with 0).
  // Base 15 (max card value = 14). All hand types produce scores at the same digit depth,
  // so primary rank always dominates. Max score: 9*15^5 + 14*(15^4+…+1) ≈ 7.5e6, safe integer.
  const DEPTH = 5;
  const BASE = 15;
  const scoreBase = (primary: number, ...tiebreakers: number[]) => {
    let score = primary;
    for (let i = 0; i < DEPTH; i++) score = score * BASE + (tiebreakers[i] ?? 0);
    return score;
  };

  if (isFlush && isStraight) {
    if (straightHigh === 14) return { rank: 'Royal Flush', score: scoreBase(9), label: 'Royal Flush' };
    return { rank: 'Straight Flush', score: scoreBase(8, straightHigh), label: `Straight Flush, ${RANK_LABEL[cards.find(c => RANK_VALUE[c.rank] === straightHigh)!.rank]}-high` };
  }
  if (topCount === 4) {
    const kicker = groups[1][1];
    return { rank: 'Four of a Kind', score: scoreBase(7, topVal, kicker), label: `Four of a Kind, ${rankName(topVal)}s` };
  }
  if (topCount === 3 && secCount === 2) {
    return { rank: 'Full House', score: scoreBase(6, topVal, secVal), label: `Full House, ${rankName(topVal)}s full of ${rankName(secVal)}s` };
  }
  if (isFlush) {
    return { rank: 'Flush', score: scoreBase(5, ...vals), label: `Flush, ${rankName(vals[0])}-high` };
  }
  if (isStraight) {
    return { rank: 'Straight', score: scoreBase(4, straightHigh), label: `Straight, ${rankName(straightHigh)}-high` };
  }
  if (topCount === 3) {
    const kickers = groups.slice(1).map(g => g[1]);
    return { rank: 'Three of a Kind', score: scoreBase(3, topVal, ...kickers), label: `Three of a Kind, ${rankName(topVal)}s` };
  }
  if (topCount === 2 && secCount === 2) {
    const kicker = groups[2][1];
    const [hi, lo] = topVal > secVal ? [topVal, secVal] : [secVal, topVal];
    return { rank: 'Two Pair', score: scoreBase(2, hi, lo, kicker), label: `Two Pair, ${rankName(hi)}s and ${rankName(lo)}s` };
  }
  if (topCount === 2) {
    const kickers = groups.slice(1).map(g => g[1]);
    return { rank: 'One Pair', score: scoreBase(1, topVal, ...kickers), label: `One Pair, ${rankName(topVal)}s` };
  }
  return { rank: 'High Card', score: scoreBase(0, ...vals), label: `High Card, ${rankName(vals[0])}` };
}

export type CompareResult = 'left' | 'right' | 'tie';

export function compareHands(left: Card[], right: Card[]): CompareResult {
  const l = evaluateHand(left);
  const r = evaluateHand(right);
  if (l.score > r.score) return 'left';
  if (r.score > l.score) return 'right';
  return 'tie';
}

function rankName(val: number): string {
  const entry = Object.entries(RANK_VALUE).find(([, v]) => v === val);
  if (!entry) return String(val);
  return RANK_LABEL[entry[0] as Rank];
}

export const ALL_CARDS: Card[] = SUITS.flatMap(suit =>
  RANKS.map(rank => ({ rank, suit }))
);

export function cardKey(c: Card): string { return `${c.rank}${c.suit}`; }

/** Given 7 cards, return the best 5-card HandResult (tries all C(7,5)=21 combos). */
export function bestFiveOf7(cards: Card[]): HandResult {
  if (cards.length !== 7) throw new Error('Need exactly 7 cards');
  let best: HandResult | null = null;
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      // Pick all 5 cards except indices i and j
      const five = cards.filter((_, k) => k !== i && k !== j);
      const result = evaluateHand(five);
      if (!best || result.score > best.score) best = result;
    }
  }
  return best!;
}

/** Compare two 7-card hands (e.g. 2 hole cards + 5 board). */
export function compareSevenCardHands(left: Card[], right: Card[]): CompareResult {
  const l = bestFiveOf7(left);
  const r = bestFiveOf7(right);
  if (l.score > r.score) return 'left';
  if (r.score > l.score) return 'right';
  return 'tie';
}
