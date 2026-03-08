import type { Session } from '../types/session';
import { projectSession } from '../engine/projection';

/** Download a JSON file of the full session data */
export function exportSessionJSON(session: Session): void {
  const json = JSON.stringify(session, null, 2);
  downloadFile(
    `felt-${session.config.name.replace(/\s+/g, '-')}-${formatDateForFilename(session.config.createdAt)}.json`,
    json,
    'application/json',
  );
}

/** Download a CSV file with player P&L summary */
export function exportSessionCSV(session: Session): void {
  const projection = projectSession(session);
  const rows: string[][] = [
    ['Player', 'Buy In', 'Cash Out', 'Net P&L', 'Rebuys'],
    ...projection.playersByPosition.map((p) => [
      p.name,
      String(p.totalBuyIn),
      String(p.currentStack),
      String(p.netProfitLoss),
      String(p.buyInCount - 1),
    ]),
  ];
  const csv = rows
    .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadFile(
    `felt-${session.config.name.replace(/\s+/g, '-')}-${formatDateForFilename(session.config.createdAt)}.csv`,
    csv,
    'text/csv',
  );
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateForFilename(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10); // "2025-03-08"
}
