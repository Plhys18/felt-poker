/**
 * PeerJS-based cross-device sync.
 *
 * Host side  – createHostPeer(sessionId, onCountChange)
 *   Creates a PeerJS peer with a deterministic ID (`felt-<sessionId>`).
 *   Returns a handle with .broadcast(snapshot) to push state to all
 *   connected spectators.
 *
 * Spectator side – createSpectatorPeer(sessionId, onSnapshot, onStatus)
 *   Connects to the host peer derived from sessionId and calls onSnapshot
 *   every time the host pushes an update.
 *
 * PeerJS uses the public `0.peerjs.com` broker only for the initial
 * WebRTC handshake; after that data flows directly P2P.
 */
import type { ShareableSnapshot } from '../types/settlement';

export type PeerConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface HostPeerHandle {
  broadcast: (snapshot: ShareableSnapshot) => void;
  destroy: () => void;
}

// Derive a stable, unique PeerJS peer ID from a session UUID.
export function toPeerId(sessionId: string): string {
  return `felt-${sessionId}`;
}

export async function createHostPeer(
  sessionId: string,
  onCountChange: (n: number) => void,
): Promise<HostPeerHandle> {
  const { Peer } = await import('peerjs');

  const peerId = toPeerId(sessionId);
  const peer = new Peer(peerId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connections = new Set<any>();
  let latestSnapshot: ShareableSnapshot | null = null;

  peer.on('error', (err) => {
    // 'unavailable-id': another tab already holds this peer ID and is serving
    // as the host. This is fine — that tab will handle spectator connections;
    // this tab still participates via BroadcastChannel.
    if ((err as { type?: string }).type !== 'unavailable-id') {
      peer.destroy();
    }
  });

  peer.on('connection', (conn) => {
    conn.on('open', () => {
      connections.add(conn);
      onCountChange(connections.size);
      // Send current state immediately so new spectator doesn't wait
      if (latestSnapshot) {
        conn.send({ type: 'SNAPSHOT', data: latestSnapshot });
      }
    });

    const cleanup = () => {
      connections.delete(conn);
      onCountChange(connections.size);
    };
    conn.on('close', cleanup);
    conn.on('error', cleanup);
  });

  return {
    broadcast(snapshot: ShareableSnapshot) {
      latestSnapshot = snapshot;
      for (const conn of connections) {
        if (conn.open) conn.send({ type: 'SNAPSHOT', data: snapshot });
      }
    },
    destroy() {
      peer.destroy();
    },
  };
}

export async function createSpectatorPeer(
  sessionId: string,
  onSnapshot: (snapshot: ShareableSnapshot) => void,
  onStatus: (status: PeerConnectionStatus) => void,
): Promise<() => void> {
  const { Peer } = await import('peerjs');

  const peer = new Peer();

  peer.on('open', () => {
    onStatus('connecting');
    const conn = peer.connect(toPeerId(sessionId), { reliable: true });

    conn.on('open', () => {
      onStatus('connected');
    });

    conn.on('data', (data) => {
      const msg = data as { type: string; data: ShareableSnapshot };
      if (msg.type === 'SNAPSHOT') {
        onSnapshot(msg.data);
      }
    });

    conn.on('close', () => onStatus('disconnected'));
    conn.on('error', () => onStatus('disconnected'));
  });

  peer.on('error', () => onStatus('disconnected'));

  return () => peer.destroy();
}
