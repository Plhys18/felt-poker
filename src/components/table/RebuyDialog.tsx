import { useState } from 'react';
import type { PlayerId } from '../../types/ids';
import { usePlayerActions } from '../../hooks/use-player-actions';
import { Dialog } from '../ui/Dialog';
import { NumberPad } from '../ui/NumberPad';
import { Button } from '../ui/Button';

interface RebuyDialogProps {
  playerId: PlayerId;
  playerName: string;
  defaultBuyIn: number;
  onClose: () => void;
}

export function RebuyDialog({ playerId, playerName, defaultBuyIn, onClose }: RebuyDialogProps) {
  const { rebuy } = usePlayerActions(playerId);
  const [chipsStr, setChipsStr] = useState(String(defaultBuyIn));

  const parsedChips = parseInt(chipsStr, 10);
  const isValid = !isNaN(parsedChips) && parsedChips > 0;

  function handleConfirm() {
    if (!isValid) return;
    rebuy(parsedChips);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title={`Rebuy — ${playerName}`}>
      <div className="space-y-4">
        <div className="flex flex-col items-center py-3 px-4 rounded-xl border bg-gold/10 border-gold text-gold">
          <span className="text-xs font-semibold uppercase tracking-wide mb-1">Chips</span>
          <span className="text-3xl font-black">{chipsStr || '0'}</span>
        </div>

        <NumberPad value={chipsStr} onChange={setChipsStr} maxLength={7} />

        <Button variant="primary" size="lg" fullWidth onClick={handleConfirm} disabled={!isValid}>
          Confirm Rebuy
        </Button>
      </div>
    </Dialog>
  );
}
