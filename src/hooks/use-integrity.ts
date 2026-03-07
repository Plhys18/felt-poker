import { useSessionStore } from '../store/session-store';
import { selectIntegrity } from '../store/selectors';
import type { IntegrityReport } from '../types/projection';

export function useIntegrity(): IntegrityReport | null {
  return useSessionStore(selectIntegrity);
}
