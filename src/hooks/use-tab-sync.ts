import { useEffect } from 'react';
import { useSessionStore } from '../store/session-store';
import { listenForBroadcasts } from '../lib/broadcast-channel';

/**
 * Listens for state broadcasts from sibling tabs and mirrors them into
 * the local Zustand store WITHOUT re-broadcasting (avoids echo loops).
 * Mount this once at the app root.
 */
export function useTabSync(): void {
  useEffect(() => {
    return listenForBroadcasts((state) => {
      useSessionStore.getState().syncFromBroadcast(state);
    });
  }, []);
}
