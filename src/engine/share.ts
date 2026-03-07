import type { Session } from '../types/session';
import type { SessionProjection } from '../types/projection';
import type { ShareableSnapshot } from '../types/settlement';

export function buildShareSnapshot(
  session: Session,
  projection: SessionProjection,
): ShareableSnapshot {
  return {
    n: session.config.name,
    p: projection.sortedLeaderboard.map((ps) => ({
      id: ps.id,
      name: ps.name,
      net: ps.netProfitLoss,
      in: ps.totalBuyIn,
      stack: ps.currentStack,
    })),
    ts: Date.now(),
  };
}

export function encodeShareSnapshot(
  session: Session,
  projection: SessionProjection,
): string {
  const snapshot = buildShareSnapshot(session, projection);
  const json = JSON.stringify(snapshot);
  // btoa requires a binary string; encode via encodeURIComponent to handle unicode
  const encoded = btoa(encodeURIComponent(json));
  return encoded;
}

export function decodeShareSnapshot(encoded: string): ShareableSnapshot | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed: unknown = JSON.parse(json);

    if (!parsed || typeof parsed !== 'object') return null;

    const obj = parsed as Record<string, unknown>;

    // Validate required fields
    if (
      typeof obj['n'] !== 'string' ||
      !Array.isArray(obj['p']) ||
      typeof obj['ts'] !== 'number'
    ) {
      return null;
    }

    return obj as unknown as ShareableSnapshot;
  } catch {
    return null;
  }
}
