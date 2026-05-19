import type { DocumentPreferences } from '@/lib/student/student-documents';
import { DEFAULT_DOC_PREFS } from '@/lib/student/student-documents';

const PREFS_KEY = 'unibridge_documents_prefs';

export function loadLocalDocumentPrefs(): DocumentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as DocumentPreferences) : null;
  } catch {
    return null;
  }
}

export function saveLocalDocumentPrefs(prefs: DocumentPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function mergePrefs(stored: DocumentPreferences | null): DocumentPreferences {
  return { ...DEFAULT_DOC_PREFS, ...stored };
}
