import { useSessionStore } from '../store/session-store';
import type { PlayerId } from '../types/ids';
import type { PlayerState } from '../types/projection';

export function usePlayer(id: PlayerId): PlayerState | undefined {
  return useSessionStore((s) =>
    s.projection?.playersByPosition.find((p) => p.id === id),
  );
}
