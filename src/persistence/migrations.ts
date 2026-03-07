import type { Session } from '../types/session';
import { CURRENT_SCHEMA_VERSION } from './constants';

// Migration framework from schema v1 → v2.
// v1 had no pre-sorted leaderboard (sort was done in selectors).
// v2 moves the sort into projectSession() and bumps schemaVersion to 2.
// Since v1 was never shipped, migrateV1toV2 is a structural no-op:
// we just update schemaVersion and let projectSession() re-derive everything.

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function migrateV1toV2(raw: Record<string, unknown>): Record<string, unknown> {
  // v1 → v2: schemaVersion bump only; projection is derived on load.
  return { ...raw, schemaVersion: 2 };
}

function migrateV2toV3(data: Record<string, unknown>): Record<string, unknown> {
  // v2 → v3: remove currency/chipValue from config (chips-only mode).
  // BUY_IN events had separate amount (money) and chipsReceived fields.
  // Going forward only chipsReceived is used; old amount field is ignored.
  const config = data['config'];
  if (isObject(config)) {
    const { currency: _c, chipValue: _cv, chipDenomination: _cd, ...rest } = config as Record<string, unknown>;
    return { ...data, schemaVersion: 3, config: rest };
  }
  return { ...data, schemaVersion: 3 };
}

export function migrateSession(raw: unknown): Session | null {
  try {
    if (!isObject(raw)) return null;

    let data = raw;
    const version = typeof data['schemaVersion'] === 'number' ? data['schemaVersion'] : 1;

    // Apply migrations in order
    if (version < 2) {
      data = migrateV1toV2(data);
    }
    if (version < 3) {
      data = migrateV2toV3(data);
    }

    if (data['schemaVersion'] !== CURRENT_SCHEMA_VERSION) return null;

    // Structural validation of required Session fields
    if (
      typeof data['schemaVersion'] !== 'number' ||
      !isObject(data['config']) ||
      !Array.isArray(data['players']) ||
      !Array.isArray(data['events']) ||
      typeof data['status'] !== 'string' ||
      (data['endedAt'] !== null && typeof data['endedAt'] !== 'number')
    ) {
      return null;
    }

    const config = data['config'];
    if (
      typeof config['id'] !== 'string' ||
      typeof config['name'] !== 'string' ||
      typeof config['defaultBuyIn'] !== 'number' ||
      typeof config['createdAt'] !== 'number'
    ) {
      return null;
    }

    return data as unknown as Session;
  } catch {
    return null;
  }
}
