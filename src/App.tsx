import { useEffect } from 'react';
import { useSession } from './hooks/use-session';
import { useTab } from './hooks/use-tab';
import { useTabSync } from './hooks/use-tab-sync';
import { usePeerHost } from './hooks/use-peer-host';
import { useSessionStore } from './store/session-store';
import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import { Sidebar } from './components/layout/Sidebar';
import { SetupView } from './components/setup/SetupView';
import { TableView } from './components/table/TableView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { SettlementView } from './components/settlement/SettlementView';
import { HistoryView } from './components/history/HistoryView';
import { HandEvalView } from './components/eval/HandEvalView';
import { StatsView } from './components/stats/StatsView';
import { AdvisorView } from './components/advisor/AdvisorView';
import { ReadOnlyView } from './components/ReadOnlyView';
import { LiveSpectatorView } from './components/LiveSpectatorView';

// Detect share / spectator URLs on initial load.
// If the user already has a saved session (they're the host) show the normal app.
const initialHash = window.location.hash;
const liveMatch = initialHash.match(/^#live=([^&]+)$/);
const shareMatch = initialHash.match(/^#share=(.+)$/);
const hasLocalSession = !!localStorage.getItem('felt:current');
const LIVE_SESSION_ID = liveMatch && !hasLocalSession ? liveMatch[1] : null;
const SHARE_ENCODED = shareMatch && !hasLocalSession ? shareMatch[1] : null;

export default function App() {
  const { config, status } = useSession();
  const { tab, setTab } = useTab();
  const loadFromStorage = useSessionStore((s) => s.loadFromStorage);
  const currentSession = useSessionStore((s) => s.currentSession);

  // Multi-tab sync (same browser)
  useTabSync();
  // Live peer host (cross-device spectators)
  const { spectatorCount } = usePeerHost();

  // Load persisted session on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Auto-navigate when a new session starts
  useEffect(() => {
    if (status === 'active' && tab === 'setup') {
      setTab('table');
    }
  }, [status, tab, setTab]);

  // Keep URL hash pointing at the live session so the Share button always
  // copies a fresh live link. Uses the session ID (stable, short, readable).
  useEffect(() => {
    if (LIVE_SESSION_ID || SHARE_ENCODED) return; // don't overwrite spectator hashes
    if (status === 'active' && currentSession) {
      window.history.replaceState(null, '', `#live=${currentSession.config.id}`);
    } else if (status !== 'active') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [status, currentSession]);

  // Show spectator views after all hooks
  if (LIVE_SESSION_ID) return <LiveSpectatorView sessionId={LIVE_SESSION_ID} />;
  if (SHARE_ENCODED) return <ReadOnlyView encoded={SHARE_ENCODED} />;

  const renderView = () => {
    if (tab === 'eval') return <HandEvalView />;
    if (tab === 'advisor') return <AdvisorView />;
    if (status === 'setup') return <SetupView setTab={setTab} />;
    switch (tab) {
      case 'table':
        return <TableView setTab={setTab} />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'settlement':
        return <SettlementView setTab={setTab} />;
      case 'history':
        return <HistoryView />;
      case 'stats':
        return <StatsView />;
      default:
        return <TableView setTab={setTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-felt-dark flex flex-col felt-grain">
      <div className="md:hidden">
        <Header sessionName={config?.name ?? null} status={status} spectatorCount={spectatorCount} />
      </div>
      <Sidebar tab={tab} setTab={setTab} status={status} sessionName={config?.name ?? null} />
      <main className="flex-1 overflow-y-auto pt-16 md:pt-6 pb-20 md:pb-6 px-3 md:px-6 md:ml-56">
        {renderView()}
      </main>
      <div className="md:hidden">
        <TabBar tab={tab} setTab={setTab} status={status} />
      </div>
    </div>
  );
}
