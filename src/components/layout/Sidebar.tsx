import { type Tab } from '../../hooks/use-tab';
import type { SessionStatus } from '../../types/session';
import { cn } from '../../lib/cn';

const SESSION_ITEMS: { tab: Tab; label: string }[] = [
  { tab: 'table', label: 'Table' },
  { tab: 'leaderboard', label: 'Leaderboard' },
  { tab: 'settlement', label: 'Settle' },
  { tab: 'history', label: 'History' },
  { tab: 'stats', label: 'Stats' },
];

interface SidebarProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  status: SessionStatus;
  sessionName: string | null;
}

export function Sidebar({ tab, setTab, status, sessionName }: SidebarProps) {
  const navItems = status === 'setup'
    ? [{ tab: 'eval' as Tab, label: 'Hand Eval' }]
    : [...SESSION_ITEMS, { tab: 'eval' as Tab, label: 'Hand Eval' }];
  return (
    <aside
      className="hidden md:flex flex-col fixed inset-y-0 left-0 w-56 border-r border-white/10 z-40"
      style={{ background: 'linear-gradient(180deg, #1a3320 0%, #0d1f16 100%)' }}
    >
      <div className="px-5 pt-6 pb-8">
        <span className="text-gold font-black text-xl tracking-tight drop-shadow-[0_0_8px_rgba(201,168,76,0.4)]">Felt</span>
        {sessionName && (
          <p className="text-white/40 text-xs mt-1 truncate">{sessionName}</p>
        )}
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map(({ tab: t, label }) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full',
              tab === t
                ? 'bg-gold/15 text-gold border-l-2 border-gold pl-[14px] shadow-[0_0_12px_rgba(201,168,76,0.15)]'
                : 'text-white/50 hover:text-white hover:bg-white/5',
            )}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto px-5 pb-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </aside>
  );
}
