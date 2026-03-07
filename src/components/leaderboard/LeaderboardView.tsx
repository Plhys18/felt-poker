import { useSessionStore } from '../../store/session-store';
import { useSession } from '../../hooks/use-session';
import { selectLeaderboard } from '../../store/selectors';
import { LeaderboardRow } from './LeaderboardRow';

export function LeaderboardView() {
  const { config } = useSession();
  const leaderboard = useSessionStore(selectLeaderboard);

  if (!config) return null;

  if (leaderboard.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/30 text-sm">No players yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-white font-black text-xl mb-4 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">Leaderboard</h2>

        <div className="bg-white/[0.06] rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-black/30">
          {/* Header row */}
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border-b border-white/10">
            <div className="w-8 flex-shrink-0" />
            <div className="flex-1 text-white/40 text-xs font-semibold uppercase tracking-wide">
              Player
            </div>
            <div className="text-right w-16 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">
              In
            </div>
            <div className="hidden sm:block text-right w-16 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">
              Stack
            </div>
            <div className="text-right w-20 flex-shrink-0 text-white/40 text-xs font-semibold uppercase tracking-wide">
              Net
            </div>
          </div>

          {/* Rows */}
          {leaderboard.map((player, i) => (
            <LeaderboardRow key={player.id} player={player} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
