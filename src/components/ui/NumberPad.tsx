import { cn } from '../../lib/cn';

interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  maxLength?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

export function NumberPad({ value, onChange, onConfirm, maxLength = 10 }: NumberPadProps) {
  function handleKey(key: string) {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }

    if (value.length >= maxLength) return;

    if (key === '.') {
      if (value.includes('.')) return;
      // Treat pressing '.' on empty as '0.'
      onChange((value === '' ? '0' : value) + '.');
      return;
    }

    // Prevent leading zeros: "0" + digit (not ".") → replace with digit
    if (value === '0' && key !== '.') {
      onChange(key);
      return;
    }

    onChange(value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => {
        const isBackspace = key === '⌫';
        const isConfirmTrigger = key === '⌫'; // backspace handled separately
        void isConfirmTrigger;

        return (
          <button
            key={key}
            type="button"
            onClick={() => handleKey(key)}
            className={cn(
              'flex items-center justify-center min-h-[64px] rounded-xl text-2xl font-bold',
              'bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95',
              'transition-all duration-100 select-none',
              isBackspace && 'text-white/60',
            )}
          >
            {key}
          </button>
        );
      })}
      {onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          className="col-span-3 flex items-center justify-center min-h-[56px] rounded-xl text-lg font-bold bg-felt-light text-white hover:brightness-110 active:scale-95 transition-all duration-100 mt-1"
        >
          Confirm
        </button>
      )}
    </div>
  );
}
