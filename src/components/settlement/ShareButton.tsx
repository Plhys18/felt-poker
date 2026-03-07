import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '../../store/session-store';
import { encodeShareSnapshot } from '../../engine/share';
import { Button } from '../ui/Button';
import { ShareIcon, CheckIcon } from '../ui/icons';

export function ShareButton() {
  const { session, projection } = useSessionStore(
    useShallow((s) => ({ session: s.currentSession, projection: s.projection })),
  );
  const [copied, setCopied] = useState(false);

  if (!session || !projection) return null;

  async function handleShare() {
    if (!session || !projection) return;

    try {
      const encoded = encodeShareSnapshot(session, projection);
      const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silent fail
    }
  }

  return (
    <Button variant="secondary" size="lg" fullWidth onClick={handleShare}>
      {copied ? (
        <>
          <CheckIcon size={18} className="mr-2 text-profit" />
          Copied!
        </>
      ) : (
        <>
          <ShareIcon size={18} className="mr-2" />
          Share Results
        </>
      )}
    </Button>
  );
}
