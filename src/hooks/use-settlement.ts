import { useMemo } from 'react';
import { useSessionStore } from '../store/session-store';
import { selectProjection } from '../store/selectors';
import { computeSettlement } from '../engine/settlement';
import type { Settlement } from '../types/settlement';

export function useSettlement(): Settlement | null {
  const projection = useSessionStore(selectProjection);
  const config = useSessionStore((s) => s.currentSession?.config ?? null);

  return useMemo(() => {
    if (!projection || !config) return null;
    return computeSettlement(projection, config);
  }, [projection, config]);
}
