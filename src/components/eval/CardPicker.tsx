import { useState, useMemo } from 'react';
import { ALL_CARDS, RANK_LABEL, SUIT_COLOR, cardKey, type Card } from '../../engine/hand-eval';
import { XIcon } from '../ui/icons';

interface CardPickerProps {
  used: Card[];
  onSelect: (card: Card) => void;
  onClose: () => void;
}

function matchesQuery(card: Card, q: string): boolean {
  const label = `${RANK_LABEL[card.rank]}${card.suit}`.toLowerCase();
  const full = `${RANK_LABEL[card.rank]} of ${suitName(card.suit)}`.toLowerCase();
  return label.includes(q) || full.includes(q);
}

function suitName(s: string) {
  return { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' }[s] ?? s;
}

export function CardPicker({ used, onSelect, onClose }: CardPickerProps) {
  const [query, setQuery] = useState('');
  const usedKeys = useMemo(() => new Set(used.map(cardKey)), [used]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? ALL_CARDS.filter(c => matchesQuery(c, q)) : ALL_CARDS;
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#0d1f16] border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
          <h3 className="text-white font-bold text-sm">Pick a Card</h3>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
            <XIcon size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search — A♠, king, hearts…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        {/* Card grid */}
        <div className="overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-4 gap-1.5">
            {filtered.map(card => {
              const key = cardKey(card);
              const isUsed = usedKeys.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isUsed}
                  onClick={() => onSelect(card)}
                  className={`
                    flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all
                    ${isUsed
                      ? 'border-white/5 bg-white/3 opacity-30 cursor-not-allowed'
                      : 'border-white/10 bg-white/5 hover:bg-white/15 hover:border-white/25 cursor-pointer active:scale-95'}
                  `}
                >
                  <span className={`text-lg font-black leading-none ${SUIT_COLOR[card.suit]}`}>
                    {RANK_LABEL[card.rank]}
                  </span>
                  <span className={`text-base leading-none mt-0.5 ${SUIT_COLOR[card.suit]}`}>
                    {card.suit}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-4 text-center py-8 text-white/30 text-sm">No cards match</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
