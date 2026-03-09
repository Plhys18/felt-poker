import React from 'react';
import { cn } from '../../lib/cn';
import type { Tab } from '../../hooks/use-tab';
import type { SessionStatus } from '../../types/session';
import { ChipIcon, HistoryIcon } from '../ui/icons';

interface TabBarProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  status: SessionStatus;
}

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const EVAL_TAB: TabDef = {
  id: 'eval',
  label: 'Eval',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="7" height="10" rx="1" />
      <rect x="15" y="3" width="7" height="10" rx="1" />
      <path d="M12 8v8M9 19h6" />
    </svg>
  ),
};

const ADVISOR_TAB: TabDef = {
  id: 'advisor',
  label: 'AI',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a4 4 0 014 4v1h1a3 3 0 010 6h-1v1a4 4 0 01-8 0v-1H7a3 3 0 010-6h1V6a4 4 0 014-4z" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M9 15c1 1 5 1 6 0" />
    </svg>
  ),
};

const ACTIVE_TABS: TabDef[] = [
  {
    id: 'table',
    label: 'Table',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Board',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'settlement',
    label: 'Settle',
    icon: <ChipIcon size={20} />,
  },
  {
    id: 'history',
    label: 'History',
    icon: <HistoryIcon size={20} />,
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
];

const SETUP_TAB: TabDef = {
  id: 'setup',
  label: 'Setup',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  ),
};

export function TabBar({ tab, setTab, status }: TabBarProps) {
  const tabs = status === 'setup' ? [SETUP_TAB, EVAL_TAB, ADVISOR_TAB] : [...ACTIVE_TABS, EVAL_TAB, ADVISOR_TAB];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(13, 31, 22, 0.90)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main navigation"
    >
      <div className="flex">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors duration-150',
                isActive ? 'text-gold' : 'text-white/40 hover:text-white/70',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={cn('mb-0.5', isActive && 'text-gold')}>{t.icon}</span>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  isActive && 'border-b-2 border-gold pb-0.5',
                )}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
