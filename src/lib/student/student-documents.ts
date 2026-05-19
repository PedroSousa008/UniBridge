import type { ContentItemType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureDocumentTables } from '@/lib/db/ensure-documents-schema';

export type DocumentCategory =
  | 'LECTURES'
  | 'WORKSHOPS'
  | 'ASSIGNMENTS'
  | 'EXAM_MATERIALS'
  | 'NOTES'
  | 'PAST_EXAMS'
  | 'EXTERNAL_RESOURCES';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  LECTURES: 'Lectures',
  WORKSHOPS: 'Workshops',
  ASSIGNMENTS: 'Assignments',
  EXAM_MATERIALS: 'Exam Materials',
  NOTES: 'Notes',
  PAST_EXAMS: 'Past Exams',
  EXTERNAL_RESOURCES: 'External Resources',
};

export const CATEGORY_ORDER: DocumentCategory[] = [
  'LECTURES',
  'WORKSHOPS',
  'ASSIGNMENTS',
  'EXAM_MATERIALS',
  'NOTES',
  'PAST_EXAMS',
  'EXTERNAL_RESOURCES',
];

export interface LibraryDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  url: string | null;
  fileUrl: string | null;
  previewUrl: string | null;
  previewType: 'pdf' | 'image' | 'slides' | 'link' | 'none';
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  semester: string | null;
  academicYear: number | null;
  professor: string | null;
  keywords: string;
  source: 'content' | 'assignment' | 'exam';
  sourceId: string;
  createdAt: string;
  updatedAt: string;
  downloadable: boolean;
}

export interface SubjectDocumentSection {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  semester: string | null;
  academicYear: number | null;
  professor: string | null;
  status: string;
  isArchived: boolean;
  isCompleted: boolean;
  categories: Record<DocumentCategory, LibraryDocument[]>;
  documentCount: number;
}

export interface DocumentLibraryHub {
  documents: LibraryDocument[];
  subjects: SubjectDocumentSection[];
  archivedSubjects: SubjectDocumentSection[];
  recentlyAdded: LibraryDocument[];
  recentlyOpened: LibraryDocument[];
  pinned: LibraryDocument[];
  starred: LibraryDocument[];
  preferences: DocumentPreferences;
  dbReady: boolean;
}

export interface DocumentPreferences {
  hideCompletedSubjects: boolean;
  pinnedIds: string[];
  starredIds: string[];
  archivedSubjectIds: string[];
  offlineSavedIds: string[];
}

export const DEFAULT_DOC_PREFS: DocumentPreferences = {
  hideCompletedSubjects: false,
  pinnedIds: [],
  starredIds: [],
  archivedSubjectIds: [],
  offlineSavedIds: [],
};

function inferPreview(url: string | null, fileUrl: string | null, type?: string): LibraryDocument['previewType'] {
  const u = (fileUrl || url || '').toLowerCase();
  if (!u) return 'none';
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return 'image';
  if (/\.pdf(\?|$)/i.test(u)) return 'pdf';
  if (type === 'SLIDES' || /\.(pptx?|key)(\?|$)/i.test(u)) return 'slides';
  if (u.startsWith('http')) return 'link';
  return 'none';
}

export function categorizeDocument(params: {
  source: LibraryDocument['source'];
  contentType?: ContentItemType | string | null;
  title: string;
  examPriority?: boolean;
}): DocumentCategory {
  const title = params.title.toLowerCase();
  if (params.source === 'assignment') return 'ASSIGNMENTS';
  if (params.source === 'exam' || params.examPriority) return 'EXAM_MATERIALS';
  const t = String(params.contentType ?? '').toUpperCase();
  if (t === 'NOTES' || title.includes('note')) return 'NOTES';
  if (t === 'LAB' || title.includes('workshop')) return 'WORKSHOPS';
  if (t === 'VIDEO' || title.includes('lecture') || t === 'SLIDES' || t === 'PDF') return 'LECTURES';
  if (title.includes('exam') || title.includes('past paper')) return 'PAST_EXAMS';
  if (t === 'LINK' || t === 'EXERCISE' || t === 'TEMPLATE') return 'EXTERNAL_RESOURCES';
  return 'LECTURES';
}

function emptyCategories(): Record<DocumentCategory, LibraryDocument[]> {
  return {
    LECTURES: [],
    WORKSHOPS: [],
    ASSIGNMENTS: [],
    EXAM_MATERIALS: [],
    NOTES: [],
    PAST_EXAMS: [],
    EXTERNAL_RESOURCES: [],
  };
}

function buildDoc(
  params: Omit<LibraryDocument, 'keywords' | 'previewUrl'> & { description?: string | null }
): LibraryDocument {
  const previewUrl = params.fileUrl || params.url;
  const { description, ...rest } = params;
  return {
    ...rest,
    previewUrl,
    keywords: [rest.title, rest.subjectName, rest.professor, description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

export function searchDocuments(docs: LibraryDocument[], query: string): LibraryDocument[] {
  const q = query.trim().toLowerCase();
  if (!q) return docs;
  return docs.filter(
    (d) =>
      d.keywords.includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.subjectName.toLowerCase().includes(q) ||
      (d.professor?.toLowerCase().includes(q) ?? false) ||
      CATEGORY_LABELS[d.category].toLowerCase().includes(q)
  );
}

export function groupDocumentsBySubject(
  docs: LibraryDocument[],
  subjectsMeta: {
    id: string;
    name: string;
    code: string | null;
    semester: string | null;
    year: number | null;
    status: string;
    professor: string | null;
  }[],
  prefs: DocumentPreferences
): { active: SubjectDocumentSection[]; archived: SubjectDocumentSection[] } {
  const archivedSet = new Set(prefs.archivedSubjectIds);
  const sections: SubjectDocumentSection[] = subjectsMeta.map((s) => {
    const subjectDocs = docs.filter((d) => d.subjectId === s.id);
    const categories = emptyCategories();
    for (const d of subjectDocs) {
      categories[d.category].push(d);
    }
    for (const cat of CATEGORY_ORDER) {
      categories[cat].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    const isCompleted = s.status === 'ARCHIVED' || s.status === 'CLOSED';
    return {
      subjectId: s.id,
      subjectName: s.name,
      subjectCode: s.code,
      semester: s.semester,
      academicYear: s.year,
      professor: s.professor,
      status: s.status,
      isArchived: archivedSet.has(s.id),
      isCompleted,
      categories,
      documentCount: subjectDocs.length,
    };
  });

  const archived = sections.filter((s) => s.isArchived || s.isCompleted);
  let active = sections.filter((s) => !s.isArchived && !s.isCompleted);
  if (prefs.hideCompletedSubjects) {
    active = active.filter((s) => !s.isCompleted);
  }
  active.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  archived.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  return { active, archived };
}

export async function loadStudentDocumentsHub(studentId: string): Promise<DocumentLibraryHub> {
  const dbReady = await ensureDocumentTables();

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId },
    include: {
      subject: {
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          course: { select: { name: true } },
        },
      },
    },
  });

  const subjectIds = enrollments.map((e) => e.subjectId);
  const subjectsMeta = enrollments.map((e) => ({
    id: e.subject.id,
    name: e.subject.name,
    code: e.subject.code,
    semester: e.subject.semester,
    year: e.subject.year,
    status: e.subject.status,
    professor: e.subject.teacher?.user?.name ?? null,
  }));

  const [contentWeeks, assignmentAttachments, examAttachments, assignments] = await Promise.all([
    prisma.subjectContentWeek.findMany({
      where: { subjectId: { in: subjectIds } },
      include: {
        subject: { select: { id: true, name: true, code: true, semester: true, year: true } },
        items: true,
      },
    }),
    prisma.assignmentAttachment.findMany({
      where: { assignment: { subjectId: { in: subjectIds } } },
      include: {
        assignment: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                semester: true,
                year: true,
                teacher: { include: { user: { select: { name: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.examAttachment.findMany({
      where: { exam: { subjectId: { in: subjectIds } }, studentId: null },
      include: {
        exam: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                semester: true,
                year: true,
                teacher: { include: { user: { select: { name: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.assignment.findMany({
      where: { subjectId: { in: subjectIds } },
      select: { id: true, title: true, subjectId: true, linksJson: true, updatedAt: true, subject: { select: { name: true, code: true, semester: true, year: true } } },
    }),
  ]);

  const docs: LibraryDocument[] = [];

  for (const week of contentWeeks) {
    const sub = week.subject;
    for (const item of week.items) {
      const url = item.url || item.fileUrl;
      if (!url && !item.fileUrl) continue;
      const category = categorizeDocument({
        source: 'content',
        contentType: item.type,
        title: item.title,
        examPriority: item.examPriority,
      });
      docs.push(
        buildDoc({
          id: `content-${item.id}`,
          title: item.title,
          category,
          url: item.url,
          fileUrl: item.fileUrl,
          previewType: inferPreview(item.url, item.fileUrl, item.type),
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          semester: sub.semester,
          academicYear: sub.year,
          professor: subjectsMeta.find((s) => s.id === sub.id)?.professor ?? null,
          source: 'content',
          sourceId: item.id,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.createdAt.toISOString(),
          downloadable: true,
          description: item.description,
        })
      );
    }
  }

  for (const att of assignmentAttachments) {
    const a = att.assignment;
    const sub = a.subject;
    docs.push(
      buildDoc({
        id: `assignment-att-${att.id}`,
        title: `${a.title} — ${att.title}`,
        category: 'ASSIGNMENTS',
        url: att.url,
        fileUrl: att.fileUrl,
        previewType: inferPreview(att.url, att.fileUrl, att.kind),
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        semester: sub.semester,
        academicYear: sub.year,
        professor: sub.teacher?.user?.name ?? null,
        source: 'assignment',
        sourceId: att.id,
        createdAt: att.createdAt.toISOString(),
        updatedAt: att.createdAt.toISOString(),
        downloadable: true,
      })
    );
  }

  for (const att of examAttachments) {
    const e = att.exam;
    if (!e.subject) continue;
    const sub = e.subject;
    docs.push(
      buildDoc({
        id: `exam-att-${att.id}`,
        title: `${e.title} — ${att.title}`,
        category: 'EXAM_MATERIALS',
        url: att.url,
        fileUrl: att.fileUrl,
        previewType: inferPreview(att.url, att.fileUrl),
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        semester: sub.semester,
        academicYear: sub.year,
        professor: sub.teacher?.user?.name ?? null,
        source: 'exam',
        sourceId: att.id,
        createdAt: att.createdAt.toISOString(),
        updatedAt: att.createdAt.toISOString(),
        downloadable: true,
      })
    );
  }

  for (const a of assignments) {
    const links = Array.isArray(a.linksJson) ? (a.linksJson as { title?: string; url?: string }[]) : [];
    links.forEach((link, i) => {
      if (!link?.url) return;
      docs.push(
        buildDoc({
          id: `assignment-link-${a.id}-${i}`,
          title: link.title || `${a.title} link`,
          category: 'EXTERNAL_RESOURCES',
          url: link.url,
          fileUrl: null,
          previewType: 'link',
          subjectId: a.subjectId,
          subjectName: a.subject.name,
          subjectCode: a.subject.code,
          semester: a.subject.semester,
          academicYear: a.subject.year,
          professor: null,
          source: 'assignment',
          sourceId: a.id,
          createdAt: a.updatedAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
          downloadable: false,
        })
      );
    });
  }

  docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  let prefs = { ...DEFAULT_DOC_PREFS };
  let recentOpens: { id: string; at: string }[] = [];

  if (dbReady) {
    const row = await prisma.studentDocumentPreference.findUnique({
      where: { studentId },
    });
    if (row) {
      prefs = {
        hideCompletedSubjects: row.hideCompletedSubjects,
        pinnedIds: row.pinnedIds ?? [],
        starredIds: row.starredIds ?? [],
        archivedSubjectIds: row.archivedSubjectIds ?? [],
        offlineSavedIds: row.offlineSavedIds ?? [],
      };
      if (Array.isArray(row.recentOpens)) {
        recentOpens = row.recentOpens as { id: string; at: string }[];
      }
    }
  }

  const docMap = new Map(docs.map((d) => [d.id, d]));
  const pinned = prefs.pinnedIds.map((id) => docMap.get(id)).filter(Boolean) as LibraryDocument[];
  const starred = prefs.starredIds.map((id) => docMap.get(id)).filter(Boolean) as LibraryDocument[];
  const recentlyAdded = [...docs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const recentlyOpened = recentOpens
    .map((r) => docMap.get(r.id))
    .filter(Boolean)
    .slice(0, 8) as LibraryDocument[];

  const { active, archived } = groupDocumentsBySubject(docs, subjectsMeta, prefs);

  return {
    documents: docs,
    subjects: active,
    archivedSubjects: archived,
    recentlyAdded,
    recentlyOpened,
    pinned,
    starred,
    preferences: prefs,
    dbReady,
  };
}
