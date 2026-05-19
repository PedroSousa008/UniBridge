import type { GradebookHubPayload } from '@/lib/student/load-gradebook-hub';

const PREFS_KEY = 'unibridge_gradebook_prefs';

export interface LocalGradebookPrefs {
  goodMin: number;
  moderateMin: number;
  passMin: number;
  targetGpa: number | null;
  creditsCompleted: number;
  creditsRequired: number;
  ectsPerSubject: number;
}

export function loadLocalGradebookPrefs(): LocalGradebookPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as LocalGradebookPrefs) : null;
  } catch {
    return null;
  }
}

export function saveLocalGradebookPrefs(prefs: LocalGradebookPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
