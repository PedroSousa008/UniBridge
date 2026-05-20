import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';

export type VerificationStatus = 'verified' | 'pending' | 'rejected';
export type CvSection =
  | 'education'
  | 'experience'
  | 'project'
  | 'skill'
  | 'achievement'
  | 'leadership'
  | 'certification'
  | 'portfolio';

export type CvVisibility = 'private' | 'peers' | 'public';

export interface CvEntry {
  id: string;
  section: CvSection;
  title: string;
  subtitle: string | null;
  body: string;
  aiBody: string | null;
  verificationStatus: VerificationStatus;
  verifiedBy: string | null;
  sourceType: string | null;
  sourceId: string | null;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  visible: boolean;
  isManual: boolean;
}

export interface CvVersion {
  id: string;
  slug: string;
  title: string;
  description: string;
  emphasis: string[];
  layoutTone: 'formal' | 'bold' | 'creative' | 'technical' | 'strategic';
}

export const CV_VERSIONS: CvVersion[] = [
  {
    id: 'corporate',
    slug: 'corporate',
    title: 'Corporate CV',
    description: 'Structured, achievement-focused — finance, consulting, corporate roles.',
    emphasis: ['education', 'experience', 'achievement'],
    layoutTone: 'formal',
  },
  {
    id: 'startup',
    slug: 'startup',
    title: 'Startup CV',
    description: 'Founder energy — ventures, traction, entrepreneurial proof first.',
    emphasis: ['portfolio', 'experience', 'project', 'leadership'],
    layoutTone: 'bold',
  },
  {
    id: 'consulting',
    slug: 'consulting',
    title: 'Consulting CV',
    description: 'Quantified impact, leadership, and analytical rigor.',
    emphasis: ['achievement', 'education', 'experience'],
    layoutTone: 'strategic',
  },
  {
    id: 'creative',
    slug: 'creative',
    title: 'Creative CV',
    description: 'Portfolio-led — projects, media, and visual proof.',
    emphasis: ['portfolio', 'project', 'achievement'],
    layoutTone: 'creative',
  },
  {
    id: 'tech',
    slug: 'tech',
    title: 'Tech CV',
    description: 'Skills-forward — engineering, product, and technical depth.',
    emphasis: ['skill', 'project', 'education'],
    layoutTone: 'technical',
  },
];

export interface VerifiedSkill {
  name: string;
  level: number;
  verified: boolean;
  evidence: string[];
}

export interface CvBadge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
  icon: string;
}

export interface CareerJourneyEvent {
  id: string;
  year: number;
  month: number;
  label: string;
  category: string;
  verificationStatus: VerificationStatus;
  href: string | null;
}

export interface CvAnalytics {
  profileStrength: number;
  completeness: number;
  recruiterAppeal: number;
  verifiedRatio: number;
  verifiedCount: number;
  pendingCount: number;
  missingSections: string[];
  topCompatibleRoles: { role: string; compatibility: number }[];
}

export interface CvImprovement {
  id: string;
  priority: 'high' | 'medium' | 'low';
  area: string;
  message: string;
  actionHref: string | null;
}

export interface RecruiterPreview {
  verificationLevel: number;
  verifiedHighlights: string[];
  filtersAvailable: string[];
  compatibilityNote: string;
}

export interface EcosystemImportInput {
  userName: string;
  program: string | null;
  universityName: string | null;
  yearOfStudy: number | null;
  profile: StudentCareerProfile;
  internships: {
    id: string;
    title: string;
    companyName: string;
    status: string;
    appliedAt: string | null;
  }[];
  startups: {
    id: string;
    name: string;
    stage: string | null;
    readinessScore: number;
    milestones: { label: string; status: string }[];
  }[];
  assignments: {
    id: string;
    title: string;
    subjectName: string;
    status: string;
    score: number | null;
  }[];
  journals: { title: string; kind: string }[];
}

function uid(prefix: string, id: string) {
  return `${prefix}-${id}`;
}

export function importVerifiedEntries(input: EcosystemImportInput): CvEntry[] {
  const entries: CvEntry[] = [];
  let order = 0;

  if (input.universityName || input.program) {
    entries.push({
      id: uid('edu', 'profile'),
      section: 'education',
      title: input.program ?? 'University Program',
      subtitle: input.universityName,
      body: input.yearOfStudy
        ? `Year ${input.yearOfStudy} — academic record tracked by UniBridge.`
        : 'Academic enrollment verified by university systems.',
      aiBody: null,
      verificationStatus: 'verified',
      verifiedBy: 'university',
      sourceType: 'enrollment',
      sourceId: 'profile',
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  if (input.profile.gradeAverage != null) {
    entries.push({
      id: uid('ach', 'gpa'),
      section: 'achievement',
      title: `Academic average: ${input.profile.gradeAverage.toFixed(1)}`,
      subtitle: 'Verified gradebook',
      body: 'Performance aggregated from graded coursework and assessments on UniBridge.',
      aiBody: writeAchievementAi(
        'Academic performance',
        input.profile.gradeAverage,
        'consulting'
      ),
      verificationStatus: 'verified',
      verifiedBy: 'university',
      sourceType: 'gradebook',
      sourceId: 'gpa',
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  if (input.profile.attendanceAverage != null && input.profile.attendanceAverage >= 70) {
    entries.push({
      id: uid('ach', 'attendance'),
      section: 'achievement',
      title: `Attendance: ${Math.round(input.profile.attendanceAverage)}%`,
      subtitle: 'Verified attendance records',
      body: 'Consistent class participation recorded across enrolled subjects.',
      aiBody: writeAchievementAi('Attendance reliability', input.profile.attendanceAverage, 'corporate'),
      verificationStatus: 'verified',
      verifiedBy: 'university',
      sourceType: 'attendance',
      sourceId: 'global',
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  for (const sub of input.profile.subjects) {
    if (sub.average == null) continue;
    entries.push({
      id: uid('edu', sub.id),
      section: 'education',
      title: sub.name,
      subtitle: sub.average >= 14 ? 'Strong performance' : 'Coursework tracked',
      body: `Subject average ${sub.average.toFixed(1)}${sub.attendance != null ? ` · ${Math.round(sub.attendance)}% attendance` : ''}.`,
      aiBody: writeAchievementAi(sub.name, sub.average, 'tech'),
      verificationStatus: 'verified',
      verifiedBy: 'university',
      sourceType: 'subject',
      sourceId: sub.id,
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  if (input.profile.assignmentCompletionRate != null) {
    entries.push({
      id: uid('ach', 'assignments'),
      section: 'achievement',
      title: `${input.profile.assignmentCompletionRate}% assignment completion`,
      subtitle: 'Platform-tracked deliverables',
      body: 'Submission history verified through academic workflow on UniBridge.',
      aiBody: writeAchievementAi('Assignment delivery', input.profile.assignmentCompletionRate, 'corporate'),
      verificationStatus: 'verified',
      verifiedBy: 'platform',
      sourceType: 'assignments',
      sourceId: 'completion',
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  for (const a of input.assignments.filter((x) => x.status === 'GRADED' && x.score != null && x.score >= 70)) {
    entries.push({
      id: uid('proj', a.id),
      section: 'project',
      title: a.title,
      subtitle: a.subjectName,
      body: `Graded deliverable — score ${a.score}/100.`,
      aiBody: writeAchievementAi(a.title, a.score!, 'tech'),
      verificationStatus: 'verified',
      verifiedBy: 'teacher',
      sourceType: 'assignment',
      sourceId: a.id,
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  for (const app of input.internships) {
    const completed = ['completed', 'accepted', 'offer_received', 'offer'].includes(app.status);
    entries.push({
      id: uid('exp', app.id),
      section: 'experience',
      title: app.title,
      subtitle: app.companyName,
      body: completed
        ? `Internship track — status: ${app.status}. Verified application on UniBridge.`
        : `Application in progress (${app.status}).`,
      aiBody: writeAchievementAi(`${app.title} at ${app.companyName}`, completed ? 90 : 50, 'corporate'),
      verificationStatus: completed ? 'verified' : 'pending',
      verifiedBy: completed ? 'company' : null,
      sourceType: 'internship',
      sourceId: app.id,
      startDate: app.appliedAt,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  for (const s of input.startups) {
    entries.push({
      id: uid('exp', s.id),
      section: 'experience',
      title: `Founder — ${s.name}`,
      subtitle: s.stage ?? 'Startup',
      body: `Startup Hub venture · readiness ${Math.round(s.readinessScore)}%.`,
      aiBody: writeAchievementAi(s.name, s.readinessScore, 'startup'),
      verificationStatus: 'verified',
      verifiedBy: 'platform',
      sourceType: 'startup',
      sourceId: s.id,
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });

    for (const m of s.milestones.filter((x) => x.status === 'done')) {
      entries.push({
        id: uid('ach', `${s.id}-${m.label}`),
        section: 'achievement',
        title: m.label,
        subtitle: s.name,
        body: 'Milestone completed in Startup Hub with platform verification.',
        aiBody: writeAchievementAi(m.label, 85, 'startup'),
        verificationStatus: 'verified',
        verifiedBy: 'platform',
        sourceType: 'startup_milestone',
        sourceId: s.id,
        startDate: null,
        endDate: null,
        sortOrder: order++,
        visible: true,
        isManual: false,
      });
    }

    entries.push({
      id: uid('lead', s.id),
      section: 'leadership',
      title: 'Startup leadership',
      subtitle: s.name,
      body: 'Founder role with team, traction, and venture milestones on UniBridge.',
      aiBody: writeAchievementAi('Founder leadership', s.readinessScore, 'startup'),
      verificationStatus: 'verified',
      verifiedBy: 'platform',
      sourceType: 'startup_founder',
      sourceId: s.id,
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  if (input.profile.hasStartup) {
    entries.push({
      id: uid('badge', 'founder'),
      section: 'portfolio',
      title: 'Startup Hub portfolio',
      subtitle: 'Live venture profile',
      body: 'Public venture page with media, milestones, and traction metrics.',
      aiBody: null,
      verificationStatus: 'verified',
      verifiedBy: 'platform',
      sourceType: 'startup_portfolio',
      sourceId: 'hub',
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  for (const j of input.journals.slice(0, 3)) {
    entries.push({
      id: uid('ach', j.title),
      section: 'achievement',
      title: j.title,
      subtitle: j.kind,
      body: 'Internship learning journal entry on UniBridge.',
      aiBody: writeAchievementAi(j.title, 75, 'consulting'),
      verificationStatus: 'verified',
      verifiedBy: 'platform',
      sourceType: 'journal',
      sourceId: j.title,
      startDate: null,
      endDate: null,
      sortOrder: order++,
      visible: true,
      isManual: false,
    });
  }

  return entries;
}

export function writeAchievementAi(
  title: string,
  metric: number,
  versionSlug: string
): string {
  const strong = metric >= 85 || metric >= 14;
  const tone =
    versionSlug === 'startup'
      ? 'venture-building and market validation'
      : versionSlug === 'consulting'
        ? 'structured problem-solving and stakeholder impact'
        : versionSlug === 'tech'
          ? 'technical delivery and analytical rigor'
          : versionSlug === 'creative'
            ? 'creative execution and portfolio-quality output'
            : 'professional discipline and measurable outcomes';

  if (strong) {
    return `Delivered strong results in ${title}, demonstrating ${tone} with outcomes tracked and verified on UniBridge.`;
  }
  return `Contributed to ${title} with documented progress across ${tone}, supported by platform-verified academic and career activity.`;
}

export function orderEntriesForVersion(entries: CvEntry[], version: CvVersion): CvEntry[] {
  const sectionOrder = [...version.emphasis, 'education', 'experience', 'skill', 'leadership', 'achievement', 'certification', 'portfolio'];
  const rank = new Map(sectionOrder.map((s, i) => [s, i]));
  return [...entries]
    .filter((e) => e.visible)
    .sort((a, b) => {
      const ra = rank.get(a.section) ?? 99;
      const rb = rank.get(b.section) ?? 99;
      if (ra !== rb) return ra - rb;
      return a.sortOrder - b.sortOrder;
    })
    .map((e) => ({
      ...e,
      aiBody: e.aiBody ?? writeAchievementAi(e.title, 70, version.slug),
    }));
}

export function inferVerifiedSkills(
  profile: StudentCareerProfile,
  entries: CvEntry[]
): VerifiedSkill[] {
  const skills: VerifiedSkill[] = [];
  const subjectNames = profile.subjects.map((s) => s.name.toLowerCase()).join(' ');

  const add = (name: string, level: number, evidence: string[], verified: boolean) => {
    if (skills.some((s) => s.name === name)) return;
    skills.push({ name, level, evidence, verified });
  };

  if (subjectNames.match(/finance|accounting|economics/)) {
    add('Financial Analysis', profile.gradeAverage ? Math.min(95, profile.gradeAverage * 6) : 72, ['Finance coursework'], true);
    add('Excel / Modeling', 78, ['Finance coursework', 'Assignments'], true);
  }
  if (subjectNames.match(/programming|computer|software|data/)) {
    add('Software Development', 82, ['Technical coursework', 'Projects'], true);
    add('Problem Solving', 80, ['Assignments', 'Projects'], true);
  }
  if (subjectNames.match(/marketing|communication|management/)) {
    add('Communication', 76, ['Coursework'], true);
    add('Strategic Thinking', 74, ['Projects'], true);
  }

  if (profile.hasStartup) {
    add('Entrepreneurship', profile.startupReadiness ?? 75, ['Startup Hub founder'], true);
    add('Leadership', Math.min(92, (profile.startupReadiness ?? 70) + 8), ['Startup leadership'], true);
  }

  if (profile.assignmentCompletionRate != null && profile.assignmentCompletionRate >= 80) {
    add('Execution & Delivery', profile.assignmentCompletionRate, ['Assignment completion'], true);
  }

  for (const e of entries.filter((x) => x.section === 'experience' && x.verificationStatus === 'verified')) {
    if (e.sourceType === 'internship') add('Professional Experience', 70, [e.title], true);
  }

  if (skills.length === 0) {
    add('Academic Discipline', profile.gradeAverage ? Math.min(88, profile.gradeAverage * 5.5) : 65, ['Gradebook'], !!profile.gradeAverage);
    add('Collaboration', 68, ['Assignments'], profile.assignmentCompletionRate != null);
  }

  return skills.sort((a, b) => b.level - a.level);
}

export function computeCvBadges(entries: CvEntry[], profile: StudentCareerProfile): CvBadge[] {
  const verified = entries.filter((e) => e.verificationStatus === 'verified');
  const hasInternship = verified.some((e) => e.sourceType === 'internship' && e.verificationStatus === 'verified');
  const hasStartup = profile.hasStartup;
  const hasLeadership = verified.some((e) => e.section === 'leadership');
  const gpaStrong = profile.gradeAverage != null && profile.gradeAverage >= 14;

  return [
    {
      id: 'verified-internship',
      label: 'Verified Internship',
      description: 'Completed or accepted internship verified via UniBridge applications.',
      earned: hasInternship,
      icon: 'briefcase',
    },
    {
      id: 'verified-leadership',
      label: 'Verified Leadership',
      description: 'Leadership role documented and verified in your ecosystem.',
      earned: hasLeadership,
      icon: 'users',
    },
    {
      id: 'verified-founder',
      label: 'Verified Startup Founder',
      description: 'Active startup profile in Startup Hub.',
      earned: hasStartup,
      icon: 'rocket',
    },
    {
      id: 'verified-academic',
      label: 'Verified Academic Excellence',
      description: 'Strong GPA verified through university gradebook.',
      earned: gpaStrong,
      icon: 'award',
    },
    {
      id: 'verified-delivery',
      label: 'Verified Delivery',
      description: 'High assignment completion tracked on platform.',
      earned: (profile.assignmentCompletionRate ?? 0) >= 85,
      icon: 'check',
    },
    {
      id: 'ecosystem-active',
      label: 'Ecosystem Active',
      description: 'Consistent engagement across academics and career modules.',
      earned: profile.engagementScore >= 50,
      icon: 'sparkles',
    },
  ];
}

export function buildCareerTimeline(entries: CvEntry[], yearOfStudy: number | null): CareerJourneyEvent[] {
  const now = new Date();
  const baseYear = now.getFullYear() - (yearOfStudy ?? 2) + 1;
  const events: CareerJourneyEvent[] = [
    {
      id: 't-enroll',
      year: baseYear,
      month: 9,
      label: 'University enrollment',
      category: 'education',
      verificationStatus: 'verified',
      href: '/student/academics/gradebook',
    },
  ];

  for (const e of entries) {
    if (e.section === 'experience' && e.sourceType === 'internship') {
      events.push({
        id: `t-${e.id}`,
        year: e.startDate ? new Date(e.startDate).getFullYear() : now.getFullYear(),
        month: e.startDate ? new Date(e.startDate).getMonth() + 1 : 6,
        label: e.title,
        category: 'internship',
        verificationStatus: e.verificationStatus,
        href: '/student/career/internships',
      });
    }
    if (e.sourceType === 'startup') {
      events.push({
        id: `t-${e.id}`,
        year: now.getFullYear(),
        month: 3,
        label: `Founded ${e.title.replace('Founder — ', '')}`,
        category: 'startup',
        verificationStatus: 'verified',
        href: '/student/startup',
      });
    }
  }

  if (entries.some((e) => e.sourceType === 'gradebook')) {
    events.push({
      id: 't-gpa',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      label: 'Academic performance snapshot',
      category: 'academics',
      verificationStatus: 'verified',
      href: '/student/academics/gradebook',
    });
  }

  return events.sort((a, b) => a.year - b.year || a.month - b.month);
}

export function computeCvAnalytics(
  entries: CvEntry[],
  profile: StudentCareerProfile,
  compatibleRoles: { role: string; compatibility: number }[]
): CvAnalytics {
  const verified = entries.filter((e) => e.verificationStatus === 'verified');
  const pending = entries.filter((e) => e.verificationStatus === 'pending');
  const sections = new Set(entries.map((e) => e.section));
  const required: CvSection[] = ['education', 'experience', 'achievement', 'skill'];
  const missingSections = required.filter((s) => !sections.has(s)).map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  const completeness = Math.min(
    100,
    Math.round(
      (sections.size / 6) * 35 +
        (verified.length / Math.max(entries.length, 1)) * 35 +
        (profile.profileStrength / 100) * 30
    )
  );

  const recruiterAppeal = Math.min(
    100,
    Math.round(
      verified.length * 4 +
        (profile.employabilityScore * 0.35) +
        (profile.gradeAverage && profile.gradeAverage >= 14 ? 15 : 0) +
        (profile.hasStartup ? 12 : 0)
    )
  );

  return {
    profileStrength: profile.profileStrength,
    completeness,
    recruiterAppeal,
    verifiedRatio: entries.length ? Math.round((verified.length / entries.length) * 100) : 0,
    verifiedCount: verified.length,
    pendingCount: pending.length,
    missingSections,
    topCompatibleRoles: compatibleRoles.slice(0, 4),
  };
}

export function buildCvImprovements(
  entries: CvEntry[],
  analytics: CvAnalytics,
  version: CvVersion
): CvImprovement[] {
  const tips: CvImprovement[] = [];
  const verified = entries.filter((e) => e.verificationStatus === 'verified');

  if (analytics.missingSections.includes('Experience')) {
    tips.push({
      id: 'exp-missing',
      priority: 'high',
      area: 'Experience',
      message: 'Add internship or work experience — verified applications rank highest with recruiters.',
      actionHref: '/student/career/internships',
    });
  }

  if (!verified.some((e) => e.section === 'achievement')) {
    tips.push({
      id: 'ach-quant',
      priority: 'high',
      area: 'Achievements',
      message:
        version.slug === 'consulting'
          ? 'Consulting recruiters value quantified achievements — your gradebook can verify GPA and project scores.'
          : 'Strengthen achievements with measurable outcomes from assignments and internships.',
      actionHref: '/student/academics/assignments',
    });
  }

  if (entries.filter((e) => e.section === 'skill').length < 2) {
    tips.push({
      id: 'skills-weak',
      priority: 'medium',
      area: 'Skills',
      message: 'Your technical and soft skills section is thin — complete more coursework and projects to unlock verified skills.',
      actionHref: '/student/academics/subjects',
    });
  }

  if (analytics.pendingCount > 0) {
    tips.push({
      id: 'pending-verify',
      priority: 'medium',
      area: 'Verification',
      message: `${analytics.pendingCount} item(s) await verification — university, teachers, or companies can confirm external experience.`,
      actionHref: null,
    });
  }

  if (version.slug === 'startup' && !entries.some((e) => e.sourceType === 'startup')) {
    tips.push({
      id: 'startup-emphasis',
      priority: 'high',
      area: 'Startup CV',
      message: 'Your startup experience should appear higher — create or complete your Startup Hub profile.',
      actionHref: '/student/startup/create',
    });
  }

  if (analytics.completeness < 70) {
    tips.push({
      id: 'complete-profile',
      priority: 'low',
      area: 'Completeness',
      message: 'Profile completeness is below recruiter expectations — fill missing sections and sync ecosystem activity.',
      actionHref: '/student/profile',
    });
  }

  return tips.slice(0, 6);
}

export function buildRecruiterPreview(
  entries: CvEntry[],
  analytics: CvAnalytics,
  primaryRole: string | null,
  compatibility: number | null
): RecruiterPreview {
  const verified = entries.filter((e) => e.verificationStatus === 'verified');
  return {
    verificationLevel: Math.min(100, analytics.verifiedRatio + (analytics.verifiedCount > 5 ? 10 : 0)),
    verifiedHighlights: verified.slice(0, 5).map((e) => e.title),
    filtersAvailable: [
      'Verified leadership',
      'Startup activity',
      'GPA threshold',
      'Internship completed',
      'Communication skills',
      'Technical projects',
    ],
    compatibilityNote:
      primaryRole && compatibility != null
        ? `This CV performs strongest for ${primaryRole} (${compatibility}% compatibility).`
        : 'Complete Career Paths to unlock role-specific CV performance insights.',
  };
}

export function runCvAdvisor(
  prompt: string,
  hub: {
    analytics: CvAnalytics;
    activeVersion: CvVersion;
    improvements: CvImprovement[];
    primaryRole: string | null;
  }
): string {
  const p = prompt.toLowerCase();
  if (p.includes('consulting') || p.includes('consultant')) {
    return `For consulting, prioritize quantified achievements and leadership evidence. Your ${hub.activeVersion.title} emphasizes ${hub.activeVersion.emphasis.join(', ')}. ${hub.improvements[0]?.message ?? 'Add verified internship outcomes.'}`;
  }
  if (p.includes('startup') || p.includes('founder')) {
    return hub.analytics.topCompatibleRoles.some((r) => r.role.toLowerCase().includes('startup'))
      ? 'Your entrepreneurial profile is a differentiator — move Startup Hub milestones and founder role above traditional experience.'
      : 'Startup CV mode works best with a live venture — complete milestones in Startup Hub for verified founder credibility.';
  }
  if (p.includes('weak') || p.includes('improve')) {
    const top = hub.improvements.slice(0, 2).map((i) => i.message).join(' ');
    return top || `Profile completeness is ${hub.analytics.completeness}%. Focus on verified internships and academic achievements.`;
  }
  if (hub.primaryRole) {
    return `Your verified identity aligns with ${hub.primaryRole}. Recruiter appeal: ${hub.analytics.recruiterAppeal}%. ${hub.improvements[0]?.message ?? 'Keep ecosystem activity updated for automatic CV refresh.'}`;
  }
  return `UniBridge CV is ${hub.analytics.verifiedRatio}% verified. Use ${hub.activeVersion.title} for target employers, and add pending items only when you can support verification later.`;
}

export function recomputeProfileStrength(analytics: CvAnalytics): number {
  return Math.min(100, Math.round(analytics.completeness * 0.45 + analytics.recruiterAppeal * 0.35 + analytics.verifiedRatio * 0.2));
}
