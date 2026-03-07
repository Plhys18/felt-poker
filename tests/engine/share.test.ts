import { describe, it, expect } from 'vitest';
import { encodeShareSnapshot, decodeShareSnapshot } from '../../src/engine/share';
import { projectSession } from '../../src/engine/projection';
import { makeSession, makePlayer, makeBuyIn } from '../helpers';

describe('share encoding', () => {
  it('round-trips a snapshot correctly', () => {
    const players = [makePlayer('Alice', 0), makePlayer('Bob', 1)];
    const session = makeSession(players);
    const withEvents = {
      ...session,
      events: [
        ...session.events,
        makeBuyIn(players[0].id, 20),
        makeBuyIn(players[1].id, 20),
      ],
    };
    const proj = projectSession(withEvents);
    const encoded = encodeShareSnapshot(withEvents, proj);
    const decoded = decodeShareSnapshot(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.n).toBe('Test Session');
    expect(decoded!.p).toHaveLength(2);
  });

  it('returns null for invalid encoded string', () => {
    expect(decodeShareSnapshot('not-valid-base64!!!')).toBeNull();
    expect(decodeShareSnapshot('')).toBeNull();
  });
});
