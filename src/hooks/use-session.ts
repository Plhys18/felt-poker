import { useSessionStore } from '../store/session-store';
import { selectStatus, selectProjection } from '../store/selectors';
import type { SessionConfig } from '../types/session';
import type { SessionProjection } from '../types/projection';
import type { SessionStatus } from '../types';

export function useSession(): {
  config: SessionConfig | null;
  status: SessionStatus;
  projection: SessionProjection | null;
  isActive: boolean;
} {
  const config = useSessionStore((s) => s.currentSession?.config ?? null);
  const status = useSessionStore(selectStatus);
  const projection = useSessionStore(selectProjection);
  const isActive = status === 'active';

  return { config, status, projection, isActive };
}
