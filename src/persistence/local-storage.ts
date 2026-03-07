import type { Session } from '../types/session';
import { STORAGE_KEYS } from './constants';
import { migrateSession } from './migrations';

export function persistCurrentSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
  } catch (err) {
    // Storage quota exceeded or private browsing restrictions — fail silently
    console.warn('[felt] Failed to persist current session:', err);
  }
}

export function loadCurrentSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return migrateSession(parsed);
  } catch {
    return null;
  }
}

export function persistHistory(sessions: Session[]): void {
  try {
    // Keep last 50 sessions max
    const capped = sessions.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(capped));
  } catch (err) {
    console.warn('[felt] Failed to persist history:', err);
  }
}

export function loadHistory(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out sessions that fail migration (null results)
    return parsed.map((item: unknown) => migrateSession(item)).filter(
      (s): s is Session => s !== null,
    );
  } catch {
    return [];
  }
}
