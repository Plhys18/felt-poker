import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../store/session-store';
import { buildShareSnapshot } from '../engine/share';
import type { HostPeerHandle } from '../lib/peer-sync';

/**
 * Manages the host-side PeerJS peer for the current session.
 *
 * - Creates a peer (derived from session ID) when a session is active.
 * - Broadcasts a fresh snapshot to all connected spectators on every
 *   state change.
 * - Destroys the peer on session end, component unmount, and page unload
 *   (beforeunload) so the PeerJS broker releases the ID promptly.
 *
 * Returns the current number of connected spectators.
 */
export function usePeerHost(): { spectatorCount: number } {
  const currentSession = useSessionStore((s) => s.currentSession);
  const projection = useSessionStore((s) => s.projection);
  const sessionId = currentSession?.config.id ?? null;

  const peerRef = useRef<HostPeerHandle | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);

  // Create / destroy peer when session starts or ends
  useEffect(() => {
    if (!sessionId) {
      peerRef.current?.destroy();
      peerRef.current = null;
      setSpectatorCount(0);
      return;
    }

    let cancelled = false;

    // Eagerly destroy peer before page unload so the broker releases the ID
    // immediately (avoids ~60-second "unavailable-id" window on refresh).
    const handleUnload = () => peerRef.current?.destroy();
    window.addEventListener('beforeunload', handleUnload);

    import('../lib/peer-sync').then(({ createHostPeer }) => {
      if (cancelled) return;
      createHostPeer(sessionId, setSpectatorCount)
        .then((handle) => {
          if (cancelled) {
            handle.destroy();
            return;
          }
          peerRef.current = handle;
          // P0-1: send the current state immediately so spectators who
          // connect before the first mutation receive something.
          const { currentSession: cs, projection: proj } = useSessionStore.getState();
          if (cs && proj) {
            handle.broadcast(buildShareSnapshot(cs, proj));
          }
        })
        .catch(() => {
          // PeerJS unavailable or ID taken by another tab — live sync
          // silently disabled; BroadcastChannel still covers same-device tabs.
        });
    });

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleUnload);
      peerRef.current?.destroy();
      peerRef.current = null;
      setSpectatorCount(0);
    };
  }, [sessionId]);

  // Push a fresh snapshot to spectators on every state change
  useEffect(() => {
    if (!currentSession || !projection || !peerRef.current) return;
    peerRef.current.broadcast(buildShareSnapshot(currentSession, projection));
  }, [currentSession, projection]);

  return { spectatorCount };
}
