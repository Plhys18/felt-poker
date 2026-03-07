import { useState } from 'react';

export type Tab = 'setup' | 'table' | 'leaderboard' | 'settlement' | 'history';

export function useTab(): {
  tab: Tab;
  setTab: (tab: Tab) => void;
} {
  const [tab, setTab] = useState<Tab>('setup');
  return { tab, setTab };
}
