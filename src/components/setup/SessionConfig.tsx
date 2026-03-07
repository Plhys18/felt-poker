import { MinusIcon, PlusIcon } from '../ui/icons';

interface SessionConfigProps {
  name: string;
  onNameChange: (name: string) => void;
  buyIn: number;
  onBuyInChange: (amount: number) => void;
}

export function SessionConfig({ name, onNameChange, buyIn, onBuyInChange }: SessionConfigProps) {
  function adjustBuyIn(delta: number) {
    onBuyInChange(Math.max(1, buyIn + delta));
  }

  return (
    <div className="space-y-5">
      {/* Session name */}
      <div className="space-y-1.5">
        <label className="text-white/60 text-xs font-semibold uppercase tracking-wide">
          Session Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Friday Night — March"
          maxLength={60}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-base font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition-colors min-h-[48px]"
        />
      </div>

      {/* Default buy-in (chips) */}
      <div className="space-y-1.5">
        <label className="text-white/60 text-xs font-semibold uppercase tracking-wide">
          Default Buy-in (chips)
        </label>
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] gap-2 w-full">
          <button
            type="button"
            onClick={() => adjustBuyIn(-50)}
            className="w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
          >
            <MinusIcon size={18} />
          </button>
          <input
            type="number"
            value={buyIn}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) onBuyInChange(v);
            }}
            min={1}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center text-xl font-bold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition-colors min-h-[48px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => adjustBuyIn(50)}
            className="w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
          >
            <PlusIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
