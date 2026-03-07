import { useState } from 'react';
import type { PlayerId } from '../../types/ids';
import { usePlayerActions } from '../../hooks/use-player-actions';
import { Dialog } from '../ui/Dialog';
import { NumberPad } from '../ui/NumberPad';
import { cn } from '../../lib/cn';

interface StackEditorProps {
  playerId: PlayerId;
  playerName: string;
  currentStack: number;
  onClose: () => void;
}

const QUICK_DELTAS = [-100, -50, -25, +25, +50, +100];

export function StackEditor({ playerId, playerName, currentStack, onClose }: StackEditorProps) {
  const { updateStack } = usePlayerActions(playerId);
  const [value, setValue] = useState('');

  function handleConfirm() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;
    updateStack(parsed, currentStack);
    onClose();
  }

  function handleQuickAdjust(delta: number) {
    const next = Math.max(0, currentStack + delta);
    updateStack(next, currentStack);
    onClose();
  }

  const parsedValue = parseInt(value, 10);
  const isValid = value.length > 0 && !isNaN(parsedValue) && parsedValue >= 0;
  const delta = isValid ? parsedValue - currentStack : null;

  return (
    <Dialog open onClose={onClose} title={`Update ${playerName}'s Stack`}>
      <div className="space-y-4">
        {/* Quick adjustments */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">Quick adjust</p>
          <div className="grid grid-cols-6 gap-1">
            {QUICK_DELTAS.map((d) => {
              const isNeg = d < 0;
              const disabled = isNeg && currentStack + d < 0;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleQuickAdjust(d)}
                  className={cn(
                    'py-2 rounded-lg text-xs font-bold border transition-colors',
                    isNeg
                      ? 'bg-loss/10 border-loss/30 text-loss hover:bg-loss/20'
                      : 'bg-profit/10 border-profit/30 text-profit hover:bg-profit/20',
                    disabled && 'opacity-30 cursor-not-allowed',
                  )}
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exact entry */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">
            Or enter exact total (now: {currentStack})
          </p>
          <div className="bg-white/5 rounded-xl p-3 text-center min-h-[56px] flex items-center justify-center border border-white/10">
            {value.length > 0 ? (
              <span className="text-white text-2xl font-black tracking-wide">
                {value}{' '}
                <span className="text-white/40 text-base font-medium">chips</span>
                {delta !== null && (
                  <span className={cn('text-base font-bold ml-2', delta > 0 ? 'text-profit' : delta < 0 ? 'text-loss' : 'text-white/40')}>
                    ({delta > 0 ? '+' : ''}{delta})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-white/30 text-base font-medium">Type new total...</span>
            )}
          </div>
        </div>

        <NumberPad
          value={value}
          onChange={setValue}
          onConfirm={isValid ? handleConfirm : undefined}
          maxLength={6}
        />
      </div>
    </Dialog>
  );
}
