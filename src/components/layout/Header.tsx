import { useState } from 'react';
import { useIntegrity } from '../../hooks/use-integrity';
import type { SessionStatus } from '../../types/session';
import { ShareIcon, CheckIcon } from '../ui/icons';

interface HeaderProps {
  sessionName: string | null;
  status: SessionStatus;
  spectatorCount?: number;
}

export function Header({ sessionName, status, spectatorCount = 0 }: HeaderProps) {
  const integrity = useIntegrity();
  const showWarning = integrity !== null && !integrity.isBalanced && status === 'active';
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(13, 31, 22, 0.85)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl font-black text-gold tracking-tight flex-shrink-0 drop-shadow-[0_0_8px_rgba(201,168,76,0.4)]">Felt</span>
          {sessionName && (
            <>
              <span className="text-white/30 text-lg flex-shrink-0">/</span>
              <span className="text-white font-semibold text-sm truncate max-w-[140px]">
                {sessionName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {showWarning && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-amber-400 text-xs font-semibold">Chip mismatch</span>
            </div>
          )}

          {status === 'active' && (
            <div className="flex items-center gap-2">
              {spectatorCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
                  </span>
                  <span className="text-xs text-profit font-semibold">
                    {spectatorCount} watching
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-semibold text-white/70 hover:text-white"
              >
                {copied ? (
                  <>
                    <CheckIcon size={13} className="text-profit" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ShareIcon size={13} />
                    Share
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
