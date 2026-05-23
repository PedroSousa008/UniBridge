import type { RecordStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureMessageTables } from '@/lib/db/ensure-messages-schema';

export interface SubjectMessageRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  semester: string | null;
  year: number | null;
  professor: string | null;
  status: RecordStatus;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  href: string;
}

export interface MessagesHub {
  activeSubjects: SubjectMessageRow[];
  archivedSubjects: SubjectMessageRow[];
  totalUnread: number;
  currentPeriod: { year: number; semester: string };
  dbReady: boolean;
}

export interface MessageSearchHit {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  hasLink: boolean;
  hasFile: boolean;
  matchedTerms: string[];
}

/** Current academic period heuristic (Northern hemisphere). */
export function getCurrentAcademicPeriod(now = new Date()): {
  year: number;
  semester: string;
  sortKey: number;
} {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 9) return { year, semester: 'Fall', sortKey: year * 10 + 3 };
  if (month <= 5) return { year, semester: 'Spring', sortKey: year * 10 + 1 };
  return { year, semester: 'Summer', sortKey: year * 10 + 2 };
}

function parseSubjectSortKey(subject: {
  semester: string | null;
  year: number | null;
}): number | null {
  if (subject.year == null) return null;
  const s = (subject.semester ?? '').toLowerCase();
  let term = 1;
  if (/fall|autumn|winter|s2|2nd|second|semester\s*2/.test(s)) term = 3;
  else if (/summer/.test(s)) term = 2;
  else if (/spring|s1|1st|first|semester\s*1/.test(s)) term = 1;
  return subject.year * 10 + term;
}

export function isSubjectArchivedForMessages(subject: {
  status: RecordStatus;
  semester: string | null;
  year: number | null;
}): boolean {
  if (subject.status === 'ARCHIVED' || subject.status === 'CLOSED') return true;
  const key = parseSubjectSortKey(subject);
  if (key == null) return false;
  const current = getCurrentAcademicPeriod();
  return key < current.sortKey;
}

const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const FILE_EXT_RE = /\.(pdf|docx?|pptx?|xlsx?|png|jpe?g|gif|zip|rar|mp4|mov)(\?|$)/i;

export function extractMessageMeta(body: string) {
  const urls = body.match(URL_RE) ?? [];
  const hasLink = urls.length > 0;
  const hasFile = urls.some((u) => FILE_EXT_RE.test(u)) || FILE_EXT_RE.test(body);
  return { urls, hasLink, hasFile };
}

export function searchMessages(
  messages: { id: string; body: string; author: { name: string | null }; createdAt: Date | string }[],
  query: string
): MessageSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);
  const wantsFiles = terms.some((t) => t === 'file' || t === 'files');
  const wantsLinks = terms.some((t) => t === 'link' || t === 'links');
  const contentTerms = terms.filter((t) => !['file', 'files', 'link', 'links'].includes(t));

  return messages
    .filter((m) => {
      const { hasLink, hasFile, urls } = extractMessageMeta(m.body);
      const haystack = [m.body.toLowerCase(), ...urls.map((u) => u.toLowerCase())].join(' ');
      if (wantsFiles && !hasFile) return false;
      if (wantsLinks && !hasLink) return false;
      if (contentTerms.length === 0) return wantsFiles || wantsLinks;
      return contentTerms.every((t) => haystack.includes(t));
    })
    .map((m) => {
      const { hasLink, hasFile } = extractMessageMeta(m.body);
      const lower = m.body.toLowerCase();
      const matchedTerms = terms.filter((t) => lower.includes(t) || (t === 'file' && hasFile) || (t === 'link' && hasLink));
      return {
        id: m.id,
        body: m.body,
        authorName: m.author.name ?? 'Unknown',
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : m.createdAt.toISOString(),
        hasLink,
        hasFile,
        matchedTerms,
      };
    });
}

export async function markSubjectMessagesRead(
  studentId: string,
  subjectId: string
): Promise<void> {
  const ready = await ensureMessageTables();
  if (!ready) return;

  const existing = await prisma.studentMessageReadState.findUnique({
    where: { studentId_subjectId: { studentId, subjectId } },
  });

  if (existing) {
    await prisma.studentMessageReadState.update({
      where: { id: existing.id },
      data: { lastReadAt: new Date() },
    });
  } else {
    await prisma.studentMessageReadState.create({
      data: { studentId, subjectId, lastReadAt: new Date() },
    });
  }
}

export async function loadStudentMessagesHub(studentId: string): Promise<MessagesHub> {
  const dbReady = await ensureMessageTables();
  const currentPeriod = getCurrentAcademicPeriod();

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId },
    include: {
      subject: {
        include: { teacher: { include: { user: { select: { name: true } } } } },
      },
    },
  });

  const subjectIds = enrollments.map((e) => e.subjectId);

  const [readStates, allRecentMessages] = await Promise.all([
    dbReady
      ? prisma.studentMessageReadState.findMany({
          where: { studentId, subjectId: { in: subjectIds } },
        })
      : Promise.resolve([]),
    prisma.subjectMessage.findMany({
      where: {
        subjectId: { in: subjectIds },
        OR: [{ channel: 'class' }, { channel: 'direct', recipientId: studentId }],
      },
      orderBy: { createdAt: 'desc' },
      select: { subjectId: true, body: true, createdAt: true, authorId: true },
    }),
  ]);

  const readMap = new Map(readStates.map((r) => [r.subjectId, r.lastReadAt]));
  const lastMsgMap = new Map<string, (typeof allRecentMessages)[0]>();
  for (const m of allRecentMessages) {
    if (!lastMsgMap.has(m.subjectId)) lastMsgMap.set(m.subjectId, m);
  }

  const unreadCounts = await Promise.all(
    subjectIds.map(async (subjectId) => {
      const lastRead = readMap.get(subjectId);
      const count = await prisma.subjectMessage.count({
        where: {
          subjectId,
          authorId: { not: studentId },
          OR: [{ channel: 'class' }, { channel: 'direct', recipientId: studentId }],
          ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
        },
      });
      return { subjectId, count };
    })
  );
  const unreadMap = new Map(unreadCounts.map((u) => [u.subjectId, u.count]));

  const rows: SubjectMessageRow[] = enrollments.map((e) => {
    const last = lastMsgMap.get(e.subjectId);
    return {
      subjectId: e.subjectId,
      subjectName: e.subject.name,
      subjectCode: e.subject.code,
      semester: e.subject.semester,
      year: e.subject.year,
      professor: e.subject.teacher?.user?.name ?? null,
      status: e.subject.status,
      unreadCount: unreadMap.get(e.subjectId) ?? 0,
      lastMessageAt: last?.createdAt.toISOString() ?? null,
      lastMessagePreview: last ? last.body.slice(0, 80) : null,
      href: `/student/academics/subjects/${e.subjectId}/messages`,
    };
  });

  const activeSubjects = rows
    .filter((r) => !isSubjectArchivedForMessages({ status: r.status, semester: r.semester, year: r.year }))
    .sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      return a.subjectName.localeCompare(b.subjectName);
    });

  const archivedSubjects = rows
    .filter((r) => isSubjectArchivedForMessages({ status: r.status, semester: r.semester, year: r.year }))
    .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));

  const totalUnread = rows.reduce((a, r) => a + r.unreadCount, 0);

  return {
    activeSubjects,
    archivedSubjects,
    totalUnread,
    currentPeriod: { year: currentPeriod.year, semester: currentPeriod.semester },
    dbReady,
  };
}
