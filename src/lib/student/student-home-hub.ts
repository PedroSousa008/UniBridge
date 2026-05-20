import { format, parseISO } from 'date-fns';
import { prisma } from '@/lib/db';
import { computeStartupReadiness } from '@/lib/startups/readiness';
import { loadGradebookHub } from '@/lib/student/load-gradebook-hub';
import { loadStudentAssignmentsHub } from '@/lib/student/student-assignments';
import { loadStudentAttendanceHub } from '@/lib/student/student-attendance';
import { loadStudentExamsHub } from '@/lib/student/student-exams';
import { loadStudentMessagesHub } from '@/lib/student/student-messages';
import {
  findNextUpcomingClass,
  formatClassCountdown,
  loadStudentWeeklySchedule,
} from '@/lib/student/weekly-schedule';

export interface HomeInsight {
  id: string;
  text: string;
  href: string;
}

export interface HomeQuickAction {
  id: string;
  label: string;
  href: string;
}

export interface HomeNextClass {
  subjectName: string;
  subjectId: string | null;
  professor: string | null;
  room: string | null;
  building: string | null;
  isOnline: boolean;
  startTime: string;
  endTime: string;
  countdown: string;
  classType: string;
}

export interface HomeDeadline {
  id: string;
  title: string;
  subjectName: string;
  dueDate: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  progressPercent: number;
  status: string;
  href: string;
}

export interface HomeRecentGrade {
  title: string;
  subjectName: string;
  score: number;
  maxScore: number;
  gradeOnTwenty: number;
  classAverage: number | null;
  href: string;
}

export interface HomeExamSnapshot {
  id: string;
  title: string;
  subjectName: string;
  countdown: string;
  startAt: string;
  prepPercent: number;
  weight: number;
  href: string;
}

export interface HomeCareerTarget {
  id: string;
  roleTitle: string;
  companyName: string | null;
  compatibility: number;
  href: string;
}

export interface HomeRecommendedAction {
  id: string;
  text: string;
  href: string;
}

export interface HomeOpportunity {
  id: string;
  title: string;
  company: string;
  type: string;
  deadline: string | null;
  relevance: number;
  href: string;
}

export interface HomeFocusItem {
  id: string;
  text: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

export interface HomeActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  href: string;
  kind: string;
}

export interface HomeStartupSnapshot {
  id: string;
  name: string;
  readiness: number;
  stage: string | null;
  milestonesDone: number;
  milestonesTotal: number;
  href: string;
}

export interface StudentHomeHub {
  userName: string | null;
  progression: {
    overall: number;
    profileStrength: number;
    employabilityScore: number;
    engagementScore: number;
    compatibilityAvg: number | null;
    gradeAverage: number | null;
    attendancePercent: number | null;
    startupReadiness: number | null;
  };
  insights: HomeInsight[];
  quickActions: HomeQuickAction[];
  nextClass: HomeNextClass | null;
  upcomingDeadline: HomeDeadline | null;
  recentGrade: HomeRecentGrade | null;
  attendance: {
    percent: number | null;
    warning: boolean;
    href: string;
  };
  pendingAssignments: { count: number; nearest: HomeDeadline | null };
  nextExam: HomeExamSnapshot | null;
  career: {
    targets: HomeCareerTarget[];
    avgCompatibility: number | null;
    recommendedActions: HomeRecommendedAction[];
  };
  startup: {
    hasStartup: boolean;
    primary: HomeStartupSnapshot | null;
  };
  opportunities: HomeOpportunity[];
  weeklyFocus: HomeFocusItem[];
  analytics: {
    gradeEvolution: { label: string; value: number }[];
    compatibilityTrend: { label: string; value: number }[];
    activityScore: number;
    startupGrowth: number | null;
  };
  activityFeed: HomeActivityItem[];
  prestige: {
    activityPercentile: number | null;
    consistencyLabel: string | null;
    improvementLabel: string | null;
  };
  sidebar: {
    unreadNotifications: number;
    unreadMessages: number;
    upcomingDeadlines: HomeDeadline[];
    notifications: { id: string; title: string; message: string; href: string | null; time: string }[];
  };
  hasData: boolean;
}

function formatCountdown(target: Date, now = new Date()): string {
  return formatClassCountdown(target, now);
}

function urgencyFromDueDate(due: Date, now = new Date()): HomeDeadline['urgency'] {
  const hours = (due.getTime() - now.getTime()) / 3600000;
  if (hours < 0) return 'critical';
  if (hours <= 24) return 'critical';
  if (hours <= 72) return 'high';
  if (hours <= 168) return 'medium';
  return 'low';
}

function computeOverallProgression(input: {
  profileStrength: number;
  employabilityScore: number;
  engagementScore: number;
  gradeAverage: number | null;
  attendancePercent: number | null;
  compatibilityAvg: number | null;
  startupReadiness: number | null;
}): number {
  const parts: number[] = [];
  if (input.profileStrength > 0) parts.push(input.profileStrength);
  if (input.employabilityScore > 0) parts.push(input.employabilityScore);
  if (input.engagementScore > 0) parts.push(Math.min(100, input.engagementScore));
  if (input.gradeAverage != null) parts.push(Math.round((input.gradeAverage / 20) * 100));
  if (input.attendancePercent != null) parts.push(input.attendancePercent);
  if (input.compatibilityAvg != null && input.compatibilityAvg > 0) parts.push(input.compatibilityAvg);
  if (input.startupReadiness != null && input.startupReadiness > 0) parts.push(input.startupReadiness);
  if (parts.length === 0) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export async function loadStudentHomeHub(studentId: string, userName: string | null): Promise<StudentHomeHub> {
  const now = new Date();

  const [
    profile,
    careerTargets,
    startups,
    notifications,
    gradebook,
    assignmentsHub,
    exams,
    attendanceHub,
    messagesHub,
    schedule,
    announcements,
  ] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: studentId } }),
    prisma.careerTarget.findMany({
      where: { userId: studentId },
      orderBy: [{ isPrimary: 'desc' }, { compatibility: 'desc' }],
      take: 4,
    }),
    prisma.startup.findMany({
      where: { founderId: studentId },
      include: {
        members: true,
        media: true,
        milestones: true,
        tractionMetrics: true,
        openings: true,
      },
      take: 3,
    }),
    prisma.notification.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    loadGradebookHub(studentId).catch(() => null),
    loadStudentAssignmentsHub(studentId).catch(() => ({
      assignments: [],
      notifications: [],
      dbReady: false,
    })),
    loadStudentExamsHub(studentId).catch(() => []),
    loadStudentAttendanceHub(studentId).catch(() => null),
    loadStudentMessagesHub(studentId).catch(() => null),
    loadStudentWeeklySchedule(studentId),
    prisma.subjectAnnouncement.findMany({
      where: {
        subject: { enrollments: { some: { studentId } } },
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      include: { subject: { select: { name: true, id: true } } },
    }),
  ]);

  const internships =
    profile?.universityId
      ? await prisma.internship.findMany({
          where: { universityId: profile.universityId, status: 'ACTIVE' },
          include: { companyUser: { include: { companyProfile: true } } },
          take: 6,
        })
      : [];

  const challenges =
    profile?.universityId
      ? await prisma.companyChallenge.findMany({
          where: { universityId: profile.universityId, status: 'ACTIVE' },
          include: { companyUser: { include: { companyProfile: true } } },
          take: 4,
        })
      : [];

  const profileStrength = profile?.profileStrength ?? 0;
  const employabilityScore = Math.round(profile?.employabilityScore ?? 0);
  const engagementScore = Math.round(profile?.engagementScore ?? 0);
  const gradeAverage = gradebook?.dashboard.semesterAverage ?? gradebook?.dashboard.overallGpa ?? null;
  const attendancePercent = attendanceHub?.overview.globalPercent ?? gradebook?.dashboard.attendanceAverage ?? null;
  const compatibilityAvg =
    careerTargets.length > 0
      ? Math.round(careerTargets.reduce((a, t) => a + t.compatibility, 0) / careerTargets.length)
      : null;

  let startupReadiness: number | null = null;
  let primaryStartup: HomeStartupSnapshot | null = null;
  if (startups.length > 0) {
    const s = startups[0]!;
    const readiness = computeStartupReadiness(s);
    startupReadiness = readiness.readinessScore;
    primaryStartup = {
      id: s.id,
      name: s.name,
      readiness: readiness.readinessScore,
      stage: s.stage,
      milestonesDone: s.milestones.filter((m) => m.status === 'completed').length,
      milestonesTotal: s.milestones.length,
      href: `/student/startup/${s.id}`,
    };
  }

  const progression = {
    overall: computeOverallProgression({
      profileStrength,
      employabilityScore,
      engagementScore,
      gradeAverage,
      attendancePercent,
      compatibilityAvg,
      startupReadiness,
    }),
    profileStrength,
    employabilityScore,
    engagementScore,
    compatibilityAvg,
    gradeAverage,
    attendancePercent,
    startupReadiness,
  };

  const pending = assignmentsHub.assignments.filter(
    (a) => !['SUBMITTED', 'GRADED'].includes(a.status)
  );
  const upcomingExams = exams.filter((e) => !e.isCompleted);

  const nextClassRaw = findNextUpcomingClass(schedule.classes, now);
  const nextClass: HomeNextClass | null = nextClassRaw
    ? {
        subjectName: nextClassRaw.cls.subjectName,
        subjectId: nextClassRaw.cls.subjectId,
        professor: nextClassRaw.cls.professor,
        room: nextClassRaw.cls.room,
        building: nextClassRaw.cls.building,
        isOnline: nextClassRaw.cls.isOnline,
        startTime: nextClassRaw.cls.startTime,
        endTime: nextClassRaw.cls.endTime,
        countdown: formatCountdown(nextClassRaw.startsAt, now),
        classType: nextClassRaw.cls.classType,
      }
    : null;

  const sortedPending = [...pending].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
  const nearestAssignment = sortedPending[0];
  const upcomingDeadline: HomeDeadline | null = nearestAssignment
    ? {
        id: nearestAssignment.id,
        title: nearestAssignment.title,
        subjectName: nearestAssignment.subject.name,
        dueDate: nearestAssignment.dueDate,
        urgency: urgencyFromDueDate(new Date(nearestAssignment.dueDate), now),
        progressPercent: nearestAssignment.progressPercent,
        status: nearestAssignment.status,
        href: `/student/academics/assignments?assignment=${nearestAssignment.id}`,
      }
    : null;

  const graded = assignmentsHub.assignments
    .filter((a) => a.score != null)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
  const recentGrade: HomeRecentGrade | null = graded[0]
    ? {
        title: graded[0].title,
        subjectName: graded[0].subject.name,
        score: graded[0].score!,
        maxScore: graded[0].maxScore,
        gradeOnTwenty: Math.round((graded[0].score! / graded[0].maxScore) * 20 * 10) / 10,
        classAverage: null,
        href: `/student/academics/gradebook`,
      }
    : gradeAverage != null
      ? {
          title: 'Semester average',
          subjectName: gradebook?.dashboard.bestSubject?.name ?? 'Overall',
          score: gradeAverage,
          maxScore: 20,
          gradeOnTwenty: gradeAverage,
          classAverage: null,
          href: '/student/academics/gradebook',
        }
      : null;

  const nextExam: HomeExamSnapshot | null = upcomingExams[0]
    ? {
        id: upcomingExams[0].id,
        title: upcomingExams[0].title,
        subjectName: upcomingExams[0].subject?.name ?? 'Exam',
        countdown: upcomingExams[0].countdown,
        startAt: upcomingExams[0].startAt,
        prepPercent: upcomingExams[0].prepPercent,
        weight: upcomingExams[0].weight,
        href: `/student/academics/exams?exam=${upcomingExams[0].id}`,
      }
    : null;

  const insights: HomeInsight[] = [];
  if (gradebook?.dashboard.risks.length) {
    const r = gradebook.dashboard.risks[0]!;
    insights.push({ id: 'grade-risk', text: r.message, href: '/student/academics/gradebook' });
  }
  if (attendancePercent != null && attendancePercent < 75) {
    insights.push({
      id: 'attendance',
      text: `Attendance is at ${attendancePercent}% — review your presence dashboard.`,
      href: '/student/academics/attendance',
    });
  }
  if (compatibilityAvg != null && compatibilityAvg >= 60) {
    insights.push({
      id: 'career',
      text: `Career compatibility averaging ${compatibilityAvg}% across your targets.`,
      href: '/student/career/paths',
    });
  }
  if (startupReadiness != null && startupReadiness > 0) {
    insights.push({
      id: 'startup',
      text: `Startup readiness at ${startupReadiness}% — keep building momentum.`,
      href: primaryStartup?.href ?? '/student/startup',
    });
  }
  if (pending.length > 0) {
    insights.push({
      id: 'assignments',
      text: `${pending.length} assignment${pending.length === 1 ? '' : 's'} need your attention.`,
      href: '/student/academics/assignments',
    });
  }
  if (messagesHub && messagesHub.totalUnread > 0) {
    insights.push({
      id: 'messages',
      text: `${messagesHub.totalUnread} unread message${messagesHub.totalUnread === 1 ? '' : 's'} across subjects.`,
      href: '/student/academics/messages',
    });
  }

  const quickActions: HomeQuickAction[] = [];
  if (nearestAssignment) {
    quickActions.push({
      id: 'assignment',
      label: 'Continue Assignment',
      href: `/student/academics/assignments?assignment=${nearestAssignment.id}`,
    });
  }
  quickActions.push({
    id: 'career',
    label: careerTargets.length ? 'View Career Path' : 'Explore Career',
    href: careerTargets.length ? '/student/career/paths' : '/student/career',
  });
  if (startups.length > 0) {
    quickActions.push({
      id: 'startup',
      label: 'Update Startup',
      href: `/student/startup/${startups[0]!.id}`,
    });
  } else {
    quickActions.push({ id: 'startup-create', label: 'Create Startup', href: '/student/startup/create' });
  }
  quickActions.push({
    id: 'messages',
    label: 'Message Professor',
    href: nextClass?.subjectId
      ? `/student/academics/subjects/${nextClass.subjectId}/messages`
      : '/student/academics/messages',
  });
  quickActions.push({ id: 'calendar', label: 'Open Calendar', href: '/student/academics/calendar' });

  const recommendedActions: HomeRecommendedAction[] = [];
  if (attendancePercent != null && attendancePercent < 80) {
    recommendedActions.push({
      id: 'att',
      text: 'Improve attendance to protect your grade trajectory',
      href: '/student/academics/attendance',
    });
  }
  if (profileStrength < 70) {
    recommendedActions.push({
      id: 'profile',
      text: 'Strengthen your profile for recruiter visibility',
      href: '/student/profile',
    });
  }
  for (const r of gradebook?.dashboard.risks.slice(0, 2) ?? []) {
    recommendedActions.push({ id: r.id, text: r.message, href: '/student/academics/gradebook' });
  }
  if (internships.length > 0) {
    recommendedActions.push({
      id: 'intern',
      text: 'Explore internship opportunities aligned with your course',
      href: '/student/career/internships',
    });
  }

  const opportunities: HomeOpportunity[] = [
    ...internships.map((i) => ({
      id: `intern-${i.id}`,
      title: i.title,
      company: i.companyUser.companyProfile?.companyName ?? 'Company',
      type: 'Internship',
      deadline: null,
      relevance: Math.min(95, 60 + (compatibilityAvg ?? 0) / 5),
      href: '/student/career/internships',
    })),
    ...challenges.map((c) => ({
      id: `challenge-${c.id}`,
      title: c.title,
      company: c.companyUser.companyProfile?.companyName ?? 'Company',
      type: 'Challenge',
      deadline: c.deadline?.toISOString() ?? null,
      relevance: 70,
      href: '/student/career',
    })),
  ].slice(0, 8);

  const weeklyFocus: HomeFocusItem[] = [];
  if (upcomingDeadline) {
    weeklyFocus.push({
      id: 'deadline',
      text: `Submit ${upcomingDeadline.title}`,
      href: upcomingDeadline.href,
      priority: upcomingDeadline.urgency === 'critical' ? 'high' : 'medium',
    });
  }
  if (nextExam) {
    weeklyFocus.push({
      id: 'exam',
      text: `Prepare for ${nextExam.title} (${nextExam.countdown})`,
      href: nextExam.href,
      priority: 'high',
    });
  }
  if (recommendedActions[0]) {
    weeklyFocus.push({
      id: recommendedActions[0].id,
      text: recommendedActions[0].text,
      href: recommendedActions[0].href,
      priority: 'medium',
    });
  }
  if (primaryStartup && primaryStartup.milestonesDone < primaryStartup.milestonesTotal) {
    weeklyFocus.push({
      id: 'milestone',
      text: `Upload startup milestone for ${primaryStartup.name}`,
      href: primaryStartup.href,
      priority: 'low',
    });
  }

  const activityFeed: HomeActivityItem[] = [
    ...notifications.slice(0, 4).map((n) => ({
      id: `n-${n.id}`,
      title: n.title,
      subtitle: n.message.slice(0, 80),
      time: n.createdAt.toISOString(),
      href: n.link ?? '/student/academics/announcements',
      kind: 'notification',
    })),
    ...announcements.slice(0, 3).map((a) => ({
      id: `a-${a.id}`,
      title: a.title,
      subtitle: a.subject.name,
      time: (a.publishedAt ?? a.createdAt).toISOString(),
      href: `/student/academics/subjects/${a.subject.id}/announcements`,
      kind: 'announcement',
    })),
    ...graded.slice(0, 2).map((g) => ({
      id: `g-${g.id}`,
      title: `Grade: ${g.title}`,
      subtitle: `${g.subject.name} — ${g.score}/${g.maxScore}`,
      time: g.submittedAt ?? new Date().toISOString(),
      href: '/student/academics/gradebook',
      kind: 'grade',
    })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 10);

  const gradeEvolution =
    gradebook?.dashboard.semesterEvolution.map((e) => ({
      label: e.label,
      value: Math.round((e.average / 20) * 100),
    })) ?? [];

  const compatibilityTrend = careerTargets.map((t, i) => ({
    label: t.roleTitle.slice(0, 12),
    value: Math.round(t.compatibility),
  }));

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const hasData =
    progression.overall > 0 ||
    pending.length > 0 ||
    careerTargets.length > 0 ||
    startups.length > 0 ||
    exams.length > 0 ||
    nextClass != null;

  return {
    userName,
    progression,
    insights,
    quickActions,
    nextClass,
    upcomingDeadline,
    recentGrade,
    attendance: {
      percent: attendancePercent,
      warning: attendancePercent != null && attendancePercent < 75,
      href: '/student/academics/attendance',
    },
    pendingAssignments: {
      count: pending.length,
      nearest: upcomingDeadline,
    },
    nextExam,
    career: {
      targets: careerTargets.map((t) => ({
        id: t.id,
        roleTitle: t.roleTitle,
        companyName: t.companyName,
        compatibility: Math.round(t.compatibility),
        href: '/student/career/paths',
      })),
      avgCompatibility: compatibilityAvg,
      recommendedActions,
    },
    startup: { hasStartup: startups.length > 0, primary: primaryStartup },
    opportunities,
    weeklyFocus,
    analytics: {
      gradeEvolution,
      compatibilityTrend,
      activityScore: engagementScore,
      startupGrowth: startupReadiness,
    },
    activityFeed,
    prestige: {
      activityPercentile: engagementScore > 0 ? Math.min(99, Math.round(engagementScore * 0.9)) : null,
      consistencyLabel:
        pending.length === 0 && attendancePercent != null && attendancePercent >= 85
          ? 'Strong academic consistency'
          : null,
      improvementLabel:
        compatibilityAvg != null && compatibilityAvg >= 55
          ? `Compatibility trending toward ${compatibilityAvg}%`
          : null,
    },
    sidebar: {
      unreadNotifications,
      unreadMessages: messagesHub?.totalUnread ?? 0,
      upcomingDeadlines: sortedPending.slice(0, 4).map((a) => ({
        id: a.id,
        title: a.title,
        subjectName: a.subject.name,
        dueDate: a.dueDate,
        urgency: urgencyFromDueDate(new Date(a.dueDate), now),
        progressPercent: a.progressPercent,
        status: a.status,
        href: `/student/academics/assignments?assignment=${a.id}`,
      })),
      notifications: notifications.slice(0, 6).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        href: n.link,
        time: format(parseISO(n.createdAt.toISOString()), 'MMM d'),
      })),
    },
    hasData,
  };
}
