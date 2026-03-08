import { useState } from 'react';
import {
  type Card,
  type HandResult,
  type CompareResult,
  RANK_LABEL,
  SUIT_COLOR,
  cardKey,
  evaluateHand,
  bestFiveOf7,
} from '../../engine/hand-eval';
import { CardPicker } from './CardPicker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PickerTarget =
  | { zone: 'left'; index: number }
  | { zone: 'right'; index: number }
  | { zone: 'board'; index: number };

// ---------------------------------------------------------------------------
// CardDisplay — empty slot or filled card button
// ---------------------------------------------------------------------------

interface CardDisplayProps {
  card: Card | null;
  onClick: () => void;
  size?: 'sm' | 'md';
}

function CardDisplay({ card, onClick, size = 'md' }: CardDisplayProps) {
  const sizeClasses = size === 'sm'
    ? 'w-full aspect-[2/3] text-base'
    : 'w-full aspect-[2/3] text-xl';

  if (!card) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${sizeClasses} rounded-xl border-2 border-dashed border-white/15 bg-white/3 flex items-center justify-center text-white/20 hover:border-white/35 hover:text-white/40 transition-all active:scale-95`}
      >
        <span className="font-light">+</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${sizeClasses} rounded-xl border border-white/20 bg-white/[0.08] shadow-md shadow-black/30 flex flex-col items-center justify-center gap-0.5 hover:bg-white/15 hover:border-white/35 transition-all active:scale-95 card-hover`}
    >
      <span className={`font-black leading-none ${SUIT_COLOR[card.suit]}`}>
        {RANK_LABEL[card.rank]}
      </span>
      <span className={`leading-none ${SUIT_COLOR[card.suit]}`}>
        {card.suit}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Board section — 0-5 community cards
// ---------------------------------------------------------------------------

interface BoardSectionProps {
  board: (Card | null)[];
  usedCards: Card[];
  onSetCard: (index: number, card: Card) => void;
  onClear: () => void;
}

function BoardSection({ board, usedCards, onSetCard, onClear }: BoardSectionProps) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Board</span>
        {board.some(c => c !== null) && (
          <button type="button" onClick={onClear} className="text-white/30 hover:text-white/60 text-xs transition-colors">
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {board.map((card, i) => (
          <CardDisplay
            key={i}
            card={card}
            onClick={() => setPickerIndex(i)}
            size="sm"
          />
        ))}
      </div>
      {pickerIndex !== null && (
        <CardPicker
          used={usedCards.filter(c => !(board[pickerIndex] && cardKey(c) === cardKey(board[pickerIndex]!)))}
          onSelect={card => { onSetCard(pickerIndex, card); setPickerIndex(null); }}
          onClose={() => setPickerIndex(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hole card panel — exactly 2 cards per player
// ---------------------------------------------------------------------------

interface HolePanelProps {
  side: 'left' | 'right';
  hole: (Card | null)[];
  usedCards: Card[];
  winner: CompareResult | null;
  result: HandResult | null;
  onSetCard: (index: number, card: Card) => void;
  onClear: () => void;
}

function HolePanel({ side, hole, usedCards, winner, result, onSetCard, onClear }: HolePanelProps) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const isWinner = winner === side;
  const isTie = winner === 'tie';
  const label = side === 'left' ? 'Player A' : 'Player B';

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all ${
      isWinner
        ? 'border-gold/50 bg-gold/5 shadow-[0_0_24px_rgba(201,168,76,0.15)]'
        : isTie
          ? 'border-white/20 bg-white/5'
          : winner !== null
            ? 'border-white/8 bg-white/3 opacity-70'
            : 'border-white/10 bg-white/[0.06]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">{label}</span>
          {isWinner && <span className="text-xs font-bold text-gold bg-gold/15 px-2 py-0.5 rounded-full">WINS</span>}
          {isTie && <span className="text-xs font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">TIE</span>}
        </div>
        {hole.some(c => c !== null) && (
          <button type="button" onClick={onClear} className="text-white/30 hover:text-white/60 text-xs transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* 2 hole card slots */}
      <div className="grid grid-cols-2 gap-2">
        {hole.map((card, i) => (
          <CardDisplay
            key={i}
            card={card}
            onClick={() => setPickerIndex(i)}
          />
        ))}
      </div>
      <p className="text-white/30 text-xs text-center">Hole Cards</p>

      {/* Best hand label */}
      <div className="min-h-[1.5rem]">
        {result && (
          <p className={`text-xs font-semibold text-center ${
            isWinner ? 'text-gold' : winner !== null ? 'text-white/40' : 'text-white/60'
          }`}>
            {result.label}
          </p>
        )}
      </div>

      {pickerIndex !== null && (
        <CardPicker
          used={usedCards.filter(c => !(hole[pickerIndex] && cardKey(c) === cardKey(hole[pickerIndex]!)))}
          onSelect={card => { onSetCard(pickerIndex, card); setPickerIndex(null); }}
          onClose={() => setPickerIndex(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HandEvalView — main component
// ---------------------------------------------------------------------------

function emptyHole(): (Card | null)[] { return [null, null]; }
function emptyBoard(): (Card | null)[] { return [null, null, null, null, null]; }

function getBestResult(hole: (Card | null)[], board: (Card | null)[]): HandResult | null {
  const holeCards = hole.filter((c): c is Card => c !== null);
  const boardCards = board.filter((c): c is Card => c !== null);
  const combined = [...holeCards, ...boardCards];

  if (combined.length < 5) return null;
  if (combined.length === 5) return evaluateHand(combined);
  if (combined.length === 6) {
    // Try all C(6,5)=6 combos — reuse bestFiveOf7 logic manually
    let best: HandResult | null = null;
    for (let i = 0; i < 6; i++) {
      const five = combined.filter((_, k) => k !== i);
      const result = evaluateHand(five);
      if (!best || result.score > best.score) best = result;
    }
    return best;
  }
  // 7 cards — use bestFiveOf7
  return bestFiveOf7(combined);
}

function getWinner(
  leftResult: HandResult | null,
  rightResult: HandResult | null,
): CompareResult | null {
  if (!leftResult || !rightResult) return null;
  if (leftResult.score > rightResult.score) return 'left';
  if (rightResult.score > leftResult.score) return 'right';
  return 'tie';
}

export function HandEvalView() {
  const [leftHole, setLeftHole] = useState<(Card | null)[]>(emptyHole());
  const [rightHole, setRightHole] = useState<(Card | null)[]>(emptyHole());
  const [board, setBoard] = useState<(Card | null)[]>(emptyBoard());

  function setHoleCard(side: 'left' | 'right', index: number, card: Card) {
    if (side === 'left') setLeftHole(h => { const next = [...h]; next[index] = card; return next; });
    else setRightHole(h => { const next = [...h]; next[index] = card; return next; });
  }

  function setBoardCard(index: number, card: Card) {
    setBoard(b => { const next = [...b]; next[index] = card; return next; });
  }

  // All selected cards (for used-card tracking)
  const allUsed: Card[] = [
    ...leftHole,
    ...rightHole,
    ...board,
  ].filter((c): c is Card => c !== null);

  const leftResult = getBestResult(leftHole, board);
  const rightResult = getBestResult(rightHole, board);
  const winner = getWinner(leftResult, rightResult);

  const hasAnyCards = allUsed.length > 0;

  function reset() {
    setLeftHole(emptyHole());
    setRightHole(emptyHole());
    setBoard(emptyBoard());
  }

  const boardCardCount = board.filter(Boolean).length;
  const leftHoleCount = leftHole.filter(Boolean).length;
  const rightHoleCount = rightHole.filter(Boolean).length;

  function statusMessage(): string {
    if (leftHoleCount < 2 && rightHoleCount < 2) return 'Deal 2 hole cards to each player to compare';
    if (leftHoleCount < 2) return 'Deal 2 hole cards to Player A';
    if (rightHoleCount < 2) return 'Deal 2 hole cards to Player B';
    if (boardCardCount === 0) return 'Optionally add up to 5 board cards';
    return '';
  }

  const msg = statusMessage();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black text-xl">Hand Evaluator</h2>
        {hasAnyCards && (
          <button type="button" onClick={reset} className="text-white/30 hover:text-white/60 text-sm transition-colors">
            Reset all
          </button>
        )}
      </div>

      {/* Winner banner */}
      {winner && (
        <div className={`rounded-2xl px-5 py-4 text-center border ${
          winner === 'tie'
            ? 'bg-white/5 border-white/15'
            : 'bg-gold/10 border-gold/30'
        }`}>
          {winner === 'tie' ? (
            <p className="text-white font-black text-2xl tracking-tight">It&apos;s a Tie</p>
          ) : (
            <>
              <p className="text-gold font-black text-2xl tracking-tight">
                {winner === 'left' ? 'Player A Wins' : 'Player B Wins'}
              </p>
              <p className="text-white/50 text-xs mt-1">
                {winner === 'left' ? leftResult?.label : rightResult?.label}
                {' beats '}
                {winner === 'left' ? rightResult?.label : leftResult?.label}
              </p>
            </>
          )}
        </div>
      )}

      {/* Status hint */}
      {msg && (
        <p className="text-white/30 text-sm text-center py-1">{msg}</p>
      )}

      {/* Board */}
      <BoardSection
        board={board}
        usedCards={allUsed}
        onSetCard={setBoardCard}
        onClear={() => setBoard(emptyBoard())}
      />

      {/* Hole card panels */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HolePanel
          side="left"
          hole={leftHole}
          usedCards={allUsed}
          winner={winner}
          result={leftResult}
          onSetCard={(i, c) => setHoleCard('left', i, c)}
          onClear={() => setLeftHole(emptyHole())}
        />
        {/* VS badge — desktop only */}
        <div className="hidden sm:flex absolute inset-y-0 left-1/2 -translate-x-1/2 items-center pointer-events-none z-10">
          <span className="text-xs font-black text-white/25 bg-[#0d1f16] px-1.5 py-1 rounded-full border border-white/10">
            VS
          </span>
        </div>
        <HolePanel
          side="right"
          hole={rightHole}
          usedCards={allUsed}
          winner={winner}
          result={rightResult}
          onSetCard={(i, c) => setHoleCard('right', i, c)}
          onClear={() => setRightHole(emptyHole())}
        />
      </div>
    </div>
  );
}
