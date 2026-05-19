import type { StudentExamCard } from '@/lib/student/student-exams';

const KEY = 'unibridge_exams_local';

export function createLocalExamId() {
  return `local-exam-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isLocalExamId(id: string) {
  return id.startsWith('local-exam-');
}

type Store = Record<string, StudentExamCard[]>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function loadLocalExams(userId: string): StudentExamCard[] {
  return readStore()[userId] ?? [];
}

export function saveLocalExam(userId: string, exam: StudentExamCard) {
  const store = readStore();
  const list = store[userId] ?? [];
  const idx = list.findIndex((e) => e.id === exam.id);
  if (idx >= 0) list[idx] = exam;
  else list.push(exam);
  store[userId] = list.sort((a, b) => a.startAt.localeCompare(b.startAt));
  writeStore(store);
}

export function removeLocalExam(userId: string, examId: string) {
  const store = readStore();
  store[userId] = (store[userId] ?? []).filter((e) => e.id !== examId);
  writeStore(store);
}
