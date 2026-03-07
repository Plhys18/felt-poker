import { useState } from 'react';
import { useSessionStore } from '../../store/session-store';
import { Dialog } from '../ui/Dialog';
import { NumberPad } from '../ui/NumberPad';
import { Button } from '../ui/Button';

interface AddPlayerDialogProps {
  defaultBuyIn: number;
  onClose: () => void;
}

export function AddPlayerDialog({ defaultBuyIn, onClose }: AddPlayerDialogProps) {
  const addPlayer = useSessionStore((s) => s.addPlayer);

  const [name, setName] = useState('');
  const [chipsStr, setChipsStr] = useState(String(defaultBuyIn));

  const parsedChips = parseInt(chipsStr, 10);
  const isValid = name.trim().length > 0 && !isNaN(parsedChips) && parsedChips > 0;

  function handleConfirm() {
    if (!isValid) return;
    addPlayer(name.trim(), parsedChips);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title="Add Player">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-bold placeholder:text-white/30 outline-none focus:border-gold/60 transition-colors"
          autoFocus
        />

        <div className="flex flex-col items-center py-3 px-4 rounded-xl border bg-gold/10 border-gold text-gold">
          <span className="text-xs font-semibold uppercase tracking-wide mb-1">Starting Chips</span>
          <span className="text-3xl font-black">{chipsStr || '0'}</span>
        </div>

        <NumberPad value={chipsStr} onChange={setChipsStr} maxLength={7} />

        <Button variant="primary" size="lg" fullWidth onClick={handleConfirm} disabled={!isValid}>
          Add Player
        </Button>
      </div>
    </Dialog>
  );
}
