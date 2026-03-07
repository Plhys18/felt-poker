export function formatTime(timestampMs: number): string {
  return new Intl.DateTimeFormat('default', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(timestampMs),
  );
}

export function formatDate(timestampMs: number): string {
  return new Intl.DateTimeFormat('default', { dateStyle: 'medium' }).format(
    new Date(timestampMs),
  );
}

export function formatDateTime(timestampMs: number): string {
  return new Intl.DateTimeFormat('default', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(timestampMs),
  );
}

export function formatDuration(startMs: number, endMs: number): string {
  const diffMs = endMs - startMs;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
