const KEY = 'unibridge-attendance-justifications';

export interface LocalJustification {
  id: string;
  subjectId: string;
  subjectName: string;
  sessionId: string | null;
  reason: string;
  fileUrl: string | null;
  documentUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export function loadLocalJustifications(): LocalJustification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalJustification[];
  } catch {
    return [];
  }
}

export function saveLocalJustification(row: LocalJustification): void {
  const list = loadLocalJustifications().filter((j) => j.id !== row.id);
  list.unshift(row);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function createLocalJustificationId(): string {
  return `local-just-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
