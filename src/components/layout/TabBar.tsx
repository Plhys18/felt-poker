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
  const tabs = status === 'setup' ? [SETUP_TAB] : ACTIVE_TABS;

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
