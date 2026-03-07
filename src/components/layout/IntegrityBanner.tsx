import { useState } from 'react';
import type { IntegrityReport } from '../../types/projection';
import { Warning, XIcon } from '../ui/icons';

interface IntegrityBannerProps {
  report: IntegrityReport;
}

export function IntegrityBanner({ report }: IntegrityBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (report.isBalanced || dismissed) return null;

  const diff = Math.abs(report.difference);

  return (
    <div className="mx-4 mb-3 rounded-xl bg-amber-500/15 border border-amber-500/40 px-4 py-3 flex items-start gap-3">
      <Warning size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-amber-300 font-semibold text-sm">
          Chip count off by {diff} chip{diff !== 1 ? 's' : ''} — check stacks
        </p>
        <p className="text-amber-400/70 text-xs mt-0.5">
          In play: {report.totalChipsInPlay} &nbsp;|&nbsp; Issued: {report.totalChipsIssued}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400/60 hover:text-amber-300 transition-colors flex-shrink-0 p-0.5"
        aria-label="Dismiss warning"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}
