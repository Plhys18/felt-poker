import { useState } from 'react';
import { useSessionStore } from '../../store/session-store';
import { selectHistory } from '../../store/selectors';
import { HistoryIcon } from '../ui/icons';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { SessionSummaryCard } from './SessionSummaryCard';

export function HistoryView() {
  const history = useSessionStore(selectHistory);
  const clearHistory = useSessionStore((s) => s.clearHistory);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  function handleClearAll() {
    clearHistory();
    setShowClearConfirm(false);
  }

  return (
    <div>
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-black text-xl">History</h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="text-loss/70 hover:text-loss text-xs font-semibold transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <HistoryIcon size={48} className="text-white/15" />
            <div className="text-center">
              <p className="text-white/40 font-semibold">No sessions yet</p>
              <p className="text-white/25 text-sm mt-1">
                Completed sessions will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[...history].reverse().map((session) => (
              <SessionSummaryCard key={session.config.id} session={session} />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear All History"
      >
        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            This will permanently delete all {history.length} session{history.length !== 1 ? 's' : ''} from history. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="md" fullWidth onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" fullWidth onClick={handleClearAll}>
              Delete All
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
