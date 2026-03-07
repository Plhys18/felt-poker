/**
 * BroadcastChannel-based tab sync.
 *
 * All tabs on the same origin share a named channel. When the host tab
 * mutates the Zustand store it calls broadcastState(); every other tab
 * receives the update and calls syncFromBroadcast() to mirror the state
 * without triggering another broadcast (avoids echo loops).
 */
import type { Session } from '../types/session';
import type { SessionProjection } from '../types/projection';

export interface BroadcastState {
  currentSession: Session | null;
  projection: SessionProjection | null;
  history: Session[];
}

const CHANNEL_NAME = 'felt:session';

let _channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!_channel) _channel = new BroadcastChannel(CHANNEL_NAME);
  return _channel;
}

export function broadcastState(state: BroadcastState): void {
  try {
    getChannel()?.postMessage({ type: 'STATE_UPDATE', payload: state });
  } catch {
    // Silently ignore: BroadcastChannel may not be supported in some envs
  }
}

export function listenForBroadcasts(
  onUpdate: (state: BroadcastState) => void,
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'STATE_UPDATE') {
      onUpdate(event.data.payload as BroadcastState);
    }
  };

  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}
