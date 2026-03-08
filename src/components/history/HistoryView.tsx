import { useState } from 'react';
import { useSessionStore } from '../../store/session-store';
import { selectHistory } from '../../store/selectors';
import { HistoryIcon } from '../ui/icons';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { SessionSummaryCard } from './SessionSummaryCard';
import { SessionDetailView } from './SessionDetailView';
import type { Session } from '../../types/session';

export function HistoryView() {
  const history = useSessionStore(selectHistory);
  const clearHistory = useSessionStore((s) => s.clearHistory);
  const loadDemoSession = useSessionStore((s) => s.loadDemoSession);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Update selectedSession if the history version changed (e.g. after dismiss)
  function handleSelect(session: Session) {
    setSelectedSession(session);
  }

  function handleBack() {
    setSelectedSession(null);
  }

  function handleClearAll() {
    clearHistory();
    setShowClearConfirm(false);
    setSelectedSession(null);
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (selectedSession) {
    // Re-resolve from history in case it was updated
    const live = history.find(s => s.config.id === selectedSession.config.id) ?? selectedSession;
    return <SessionDetailView session={live} onBack={handleBack} />;
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-black text-xl">History</h2>
          <div className="flex items-center gap-3">
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
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <HistoryIcon size={48} className="text-white/15" />
            <div className="text-center">
              <p className="text-white/40 font-semibold">No sessions yet</p>
              <p className="text-white/25 text-sm mt-1">
                Completed sessions will appear here
              </p>
            </div>
            <button
              type="button"
              onClick={loadDemoSession}
              className="px-5 py-2.5 rounded-xl bg-gold/15 text-gold text-sm font-bold hover:bg-gold/25 transition-colors border border-gold/30"
            >
              Load Demo Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {[...history].reverse().map((session) => (
              <SessionSummaryCard
                key={session.config.id}
                session={session}
                onSelect={handleSelect}
              />
            ))}
            <button
              type="button"
              onClick={loadDemoSession}
              className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-white/30 text-sm font-semibold hover:border-gold/30 hover:text-gold/60 transition-colors"
            >
              + Load Demo Session
            </button>
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
