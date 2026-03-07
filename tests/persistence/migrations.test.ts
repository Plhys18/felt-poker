import { describe, it, expect } from 'vitest';
import { migrateSession } from '../../src/persistence/migrations';
import { makeSession, makePlayer, makeConfig } from '../helpers';

// Build a plain object that matches the v2 Session shape (with currency/chipValue)
function makeRawV2Session(overrides?: Record<string, unknown>): Record<string, unknown> {
  const cfg = makeConfig();
  return {
    schemaVersion: 2,
    config: {
      id: cfg.id,
      name: cfg.name,
      defaultBuyIn: cfg.defaultBuyIn,
      currency: 'CZK',
      chipValue: 1,
      createdAt: cfg.createdAt,
    },
    players: [],
    events: [],
    status: 'active',
    endedAt: null,
    ...overrides,
  };
}

// Build a plain object that matches the current v3 Session shape (chips only)
function makeRawV3Session(overrides?: Record<string, unknown>): Record<string, unknown> {
  const cfg = makeConfig();
  return {
    schemaVersion: 3,
    config: {
      id: cfg.id,
      name: cfg.name,
      defaultBuyIn: cfg.defaultBuyIn,
      createdAt: cfg.createdAt,
    },
    players: [],
    events: [],
    status: 'active',
    endedAt: null,
    ...overrides,
  };
}

describe('migrateSession', () => {
  it('returns null for null input', () => {
    expect(migrateSession(null)).toBeNull();
  });

  it('returns null for empty object {}', () => {
    // {} has no required fields at all — config is missing, etc.
    expect(migrateSession({})).toBeNull();
  });

  it('returns null for string input', () => {
    expect(migrateSession('some string')).toBeNull();
  });

  it('returns null for number input', () => {
    expect(migrateSession(42)).toBeNull();
  });

  it('returns null for array input', () => {
    expect(migrateSession([])).toBeNull();
  });

  it('returns null for object missing config field', () => {
    const raw = makeRawV2Session();
    delete (raw as Record<string, unknown>)['config'];
    expect(migrateSession(raw)).toBeNull();
  });

  it('returns null for object missing players field', () => {
    const raw = makeRawV2Session();
    delete (raw as Record<string, unknown>)['players'];
    expect(migrateSession(raw)).toBeNull();
  });

  it('returns null for object missing events field', () => {
    const raw = makeRawV2Session();
    delete (raw as Record<string, unknown>)['events'];
    expect(migrateSession(raw)).toBeNull();
  });

  it('returns null for object missing status field', () => {
    const raw = makeRawV2Session();
    delete (raw as Record<string, unknown>)['status'];
    expect(migrateSession(raw)).toBeNull();
  });

  it('returns null when config is missing required sub-fields (e.g. name)', () => {
    const raw = makeRawV2Session({
      config: {
        // name is missing
        id: 'some-id',
        defaultBuyIn: 20,
        currency: 'CHF',
        chipValue: 1,
        createdAt: Date.now(),
      },
    });
    expect(migrateSession(raw)).toBeNull();
  });

  it('returns valid Session for a correctly shaped v3 object', () => {
    const raw = makeRawV3Session();
    const session = migrateSession(raw);

    expect(session).not.toBeNull();
    expect(session!.schemaVersion).toBe(3);
    expect(session!.status).toBe('active');
    expect(session!.endedAt).toBeNull();
    expect(Array.isArray(session!.players)).toBe(true);
    expect(Array.isArray(session!.events)).toBe(true);
  });

  it('migrates v2 object (with currency/chipValue) to v3', () => {
    const raw = makeRawV2Session();
    const session = migrateSession(raw);

    expect(session).not.toBeNull();
    expect(session!.schemaVersion).toBe(3);
  });

  it('bumps schemaVersion from 1 to 3 (v1 migration chain)', () => {
    const rawV1 = makeRawV2Session({ schemaVersion: 1 });
    const session = migrateSession(rawV1);

    expect(session).not.toBeNull();
    expect(session!.schemaVersion).toBe(3);
  });

  it('returns null when schemaVersion is absent and config is invalid', () => {
    // No schemaVersion means treated as v1; if config also broken → null
    const raw = {
      // No schemaVersion
      config: 'not-an-object',
      players: [],
      events: [],
      status: 'active',
      endedAt: null,
    };
    expect(migrateSession(raw)).toBeNull();
  });

  it('preserves config fields correctly after migration', () => {
    const cfg = makeConfig({ name: 'My Game', defaultBuyIn: 50 });
    const raw = makeRawV3Session({
      config: {
        id: cfg.id,
        name: cfg.name,
        defaultBuyIn: cfg.defaultBuyIn,
        createdAt: cfg.createdAt,
      },
    });
    const session = migrateSession(raw);

    expect(session).not.toBeNull();
    expect(session!.config.name).toBe('My Game');
    expect(session!.config.defaultBuyIn).toBe(50);
  });

  it('accepts a real Session object serialised and parsed back', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    // Simulate the JSON round-trip that localStorage does
    const roundTripped: unknown = JSON.parse(JSON.stringify(session));
    const migrated = migrateSession(roundTripped);

    expect(migrated).not.toBeNull();
    expect(migrated!.players).toHaveLength(2);
    expect(migrated!.config.name).toBe('Test Session');
  });
});
