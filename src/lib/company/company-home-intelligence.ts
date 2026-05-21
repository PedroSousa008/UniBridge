export type TrendDirection = 'up' | 'down' | 'flat';

export function weekAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export function trendFromDelta(delta: number, activeLabel = 'Active'): { direction: TrendDirection; label: string } {
  if (delta > 0) return { direction: 'up', label: `+${delta} this week` };
  if (delta < 0) return { direction: 'down', label: `${delta} this week` };
  return { direction: 'flat', label: activeLabel };
}

export function priorityScore(urgency: number, impact: number, recencyHours: number): number {
  const recency = Math.max(0, 48 - recencyHours) * 0.5;
  return urgency * 10 + impact * 5 + recency;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatEventWhen(startsAt: string): string {
  const start = new Date(startsAt);
  const now = new Date();
  const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
