import { useSessionStore } from '../../store/session-store';
import { selectHistory } from '../../store/selectors';
import { HistoryIcon } from '../ui/icons';
import { SessionSummaryCard } from './SessionSummaryCard';

export function HistoryView() {
  const history = useSessionStore(selectHistory);

  return (
    <div>
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-white font-black text-xl">History</h2>

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
    </div>
  );
}
