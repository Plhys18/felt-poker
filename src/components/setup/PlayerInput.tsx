import { XIcon } from '../ui/icons';

interface PlayerInputProps {
  index: number;
  name: string;
  onChange: (name: string) => void;
  onRemove: () => void;
}

export function PlayerInput({ index, name, onChange, onRemove }: PlayerInputProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/30 text-sm font-semibold w-5 text-right flex-shrink-0">
        {index + 1}
      </span>
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Player ${index + 1}`}
        maxLength={24}
        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/40 transition-colors min-h-[44px]"
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={`Remove player ${index + 1}`}
      >
        <XIcon size={18} />
      </button>
    </div>
  );
}
