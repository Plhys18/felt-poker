import { useState } from 'react';
import {
  type Card,
  type HandResult,
  RANK_LABEL,
  SUIT_COLOR,
  cardKey,
  evaluateHand,
  compareHands,
} from '../../engine/hand-eval';
import { CardPicker } from './CardPicker';

interface SlotState {
  cards: (Card | null)[];
}

function empty(): SlotState { return { cards: [null, null, null, null, null] }; }

function allCards(left: SlotState, right: SlotState): Card[] {
  return [...left.cards, ...right.cards].filter((c): c is Card => c !== null);
}

interface CardDisplayProps {
  card: Card | null;
  onClick: () => void;
  disabled?: boolean;
}

function CardDisplay({ card, onClick, disabled }: CardDisplayProps) {
  if (!card) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full aspect-[2/3] rounded-xl border-2 border-dashed border-white/15 bg-white/3 flex items-center justify-center text-white/20 hover:border-white/35 hover:text-white/40 transition-all active:scale-95"
      >
        <span className="text-2xl font-light">+</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full aspect-[2/3] rounded-xl border border-white/20 bg-white/[0.08] shadow-md shadow-black/30 flex flex-col items-center justify-center gap-0.5 hover:bg-white/15 hover:border-white/35 transition-all active:scale-95 card-hover"
    >
      <span className={`text-xl font-black leading-none ${SUIT_COLOR[card.suit]}`}>
        {RANK_LABEL[card.rank]}
      </span>
      <span className={`text-xl leading-none ${SUIT_COLOR[card.suit]}`}>
        {card.suit}
      </span>
    </button>
  );
}

interface HandPanelProps {
  side: 'left' | 'right';
  state: SlotState;
  usedCards: Card[];
  winner: 'left' | 'right' | 'tie' | null;
  result: HandResult | null;
  onSetCard: (index: number, card: Card) => void;
  onClear: () => void;
}

function HandPanel({ side, state, usedCards, winner, result, onSetCard, onClear }: HandPanelProps) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const isWinner = winner === side;
  const isTie = winner === 'tie';
  const label = side === 'left' ? 'Hand A' : 'Hand B';

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
        {state.cards.some(c => c !== null) && (
          <button type="button" onClick={onClear} className="text-white/30 hover:text-white/60 text-xs transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Card slots — click empty slot to pick, click filled slot to swap */}
      <div className="grid grid-cols-5 gap-2">
        {state.cards.map((card, i) => (
          <CardDisplay
            key={i}
            card={card}
            onClick={() => setPickerIndex(i)}
          />
        ))}
      </div>

      {/* Hand name */}
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
          used={usedCards.filter(c => !(state.cards[pickerIndex] && cardKey(c) === cardKey(state.cards[pickerIndex]!)))}
          onSelect={card => { onSetCard(pickerIndex, card); setPickerIndex(null); }}
          onClose={() => setPickerIndex(null)}
        />
      )}
    </div>
  );
}

export function HandEvalView() {
  const [left, setLeft] = useState<SlotState>(empty());
  const [right, setRight] = useState<SlotState>(empty());

  function setCard(side: 'left' | 'right', index: number, card: Card) {
    if (side === 'left') setLeft(s => { const cards = [...s.cards]; cards[index] = card; return { cards }; });
    else setRight(s => { const cards = [...s.cards]; cards[index] = card; return { cards }; });
  }

  const leftFull = left.cards.every(c => c !== null);
  const rightFull = right.cards.every(c => c !== null);
  const bothFull = leftFull && rightFull;

  const leftResult = leftFull ? evaluateHand(left.cards as Card[]) : null;
  const rightResult = rightFull ? evaluateHand(right.cards as Card[]) : null;
  const winner = bothFull ? compareHands(left.cards as Card[], right.cards as Card[]) : null;

  const used = allCards(left, right);

  function reset() { setLeft(empty()); setRight(empty()); }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black text-xl">Hand Evaluator</h2>
        {(left.cards.some(Boolean) || right.cards.some(Boolean)) && (
          <button type="button" onClick={reset} className="text-white/30 hover:text-white/60 text-sm transition-colors">
            Reset all
          </button>
        )}
      </div>

      {/* VS banner */}
      {bothFull && winner && (
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
                {winner === 'left' ? 'Hand A Wins' : 'Hand B Wins'}
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

      {!bothFull && (
        <p className="text-white/30 text-sm text-center py-1">
          {!leftFull && !rightFull
            ? 'Fill both hands with 5 cards to see the winner'
            : !leftFull
              ? 'Fill Hand A to compare'
              : 'Fill Hand B to compare'}
        </p>
      )}

      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HandPanel
          side="left"
          state={left}
          usedCards={used}
          winner={winner}
          result={leftResult}
          onSetCard={(i, c) => setCard('left', i, c)}
          onClear={() => setLeft(empty())}
        />
        {/* VS badge — desktop only, always visible as a separator */}
        <div className="hidden sm:flex absolute inset-y-0 left-1/2 -translate-x-1/2 items-center pointer-events-none z-10">
          <span className="text-xs font-black text-white/25 bg-[#0d1f16] px-1.5 py-1 rounded-full border border-white/10">
            VS
          </span>
        </div>
        <HandPanel
          side="right"
          state={right}
          usedCards={used}
          winner={winner}
          result={rightResult}
          onSetCard={(i, c) => setCard('right', i, c)}
          onClear={() => setRight(empty())}
        />
      </div>
    </div>
  );
}
