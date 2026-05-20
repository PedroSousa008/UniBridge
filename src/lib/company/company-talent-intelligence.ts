export type TalentClusterId =
  | 'high_potential'
  | 'future_leaders'
  | 'startup_minds'
  | 'top_academic'
  | 'fastest_growing'
  | 'most_compatible';

export const TALENT_CLUSTER_META: Record<
  TalentClusterId,
  { title: string; description: string }
> = {
  high_potential: {
    title: 'High potential',
    description: 'Strong activity, profile strength, leadership, and verified experiences.',
  },
  future_leaders: {
    title: 'Future leaders',
    description: 'Networking, events, leadership roles, and consistent progression.',
  },
  startup_minds: {
    title: 'Startup minds',
    description: 'Building startups, innovation, and founder profiles.',
  },
  top_academic: {
    title: 'Top academic profiles',
    description: 'Academic consistency, certifications, and verified achievements.',
  },
  fastest_growing: {
    title: 'Fastest growing',
    description: 'Rapid gains in profile strength, compatibility, and activity.',
  },
  most_compatible: {
    title: 'Most compatible',
    description: 'Highest alignment with your company ecosystem.',
  },
};

export type TalentAiSectionId =
  | 'recommended'
  | 'hidden_gems'
  | 'rising_talent'
  | 'startup_founders'
  | 'most_active'
  | 'open_to_opportunities'
  | 'interested_consulting'
  | 'interested_finance';

export const TALENT_AI_SECTIONS: { id: TalentAiSectionId; title: string; subtitle: string }[] = [
  { id: 'recommended', title: 'Recommended for you', subtitle: 'Top matches for your hiring profile' },
  { id: 'hidden_gems', title: 'Hidden gems', subtitle: 'High compatibility, under the radar' },
  { id: 'rising_talent', title: 'Rising talent', subtitle: 'Early in their degree, already exceptional' },
  { id: 'startup_founders', title: 'Startup founders', subtitle: 'Builders in your partner university' },
  { id: 'most_active', title: 'Most active this month', subtitle: 'Highest engagement in the ecosystem' },
  { id: 'open_to_opportunities', title: 'Open to opportunities', subtitle: 'Actively seeking roles' },
  { id: 'interested_consulting', title: 'Interested in consulting', subtitle: 'Signals from paths and programs' },
  { id: 'interested_finance', title: 'Interested in finance', subtitle: 'Signals from paths and programs' },
];

export function degreeKeyFromStudent(input: {
  courseName: string | null;
  program: string | null;
}): string {
  const name = (input.courseName ?? input.program ?? '').trim();
  return name || 'General studies';
}

export function graduationYearsLeft(yearOfStudy: number | null): number | null {
  if (yearOfStudy == null) return null;
  return Math.max(1, 4 - yearOfStudy);
}

export function matchesGraduationFilter(
  yearsLeft: number | null,
  filter: string
): boolean {
  if (filter === 'all') return true;
  if (yearsLeft == null) return filter === 'unknown';
  if (filter === '1') return yearsLeft <= 1;
  if (filter === '2') return yearsLeft === 2;
  if (filter === '3plus') return yearsLeft >= 3;
  return true;
}

export function programInterestTags(program: string | null, primaryRole: string | null): string[] {
  const text = `${program ?? ''} ${primaryRole ?? ''}`.toLowerCase();
  const tags: string[] = [];
  if (/consult|strategy|management|business/.test(text)) tags.push('consulting');
  if (/financ|econom|account|bank/.test(text)) tags.push('finance');
  if (/tech|computer|engineer|data|ai/.test(text)) tags.push('tech');
  if (/law|legal/.test(text)) tags.push('law');
  return tags;
}

export function assignTalentClusters(card: {
  compatibilityScore: number;
  employabilityScore: number;
  profileStrength: number;
  leadershipScore: number;
  hasStartup: boolean;
  verifiedBadges: number;
  engagementScore: number;
  achievementCount: number;
  growthSignal: number;
}): TalentClusterId[] {
  const clusters: TalentClusterId[] = [];

  if (
    card.profileStrength >= 68 &&
    card.employabilityScore >= 62 &&
    (card.verifiedBadges >= 2 || card.leadershipScore >= 65)
  ) {
    clusters.push('high_potential');
  }
  if (card.leadershipScore >= 72 || card.engagementScore >= 70) {
    clusters.push('future_leaders');
  }
  if (card.hasStartup) clusters.push('startup_minds');
  if (card.employabilityScore >= 75 && card.profileStrength >= 60) {
    clusters.push('top_academic');
  }
  if (card.growthSignal >= 65 || (card.profileStrength >= 55 && card.engagementScore >= 75)) {
    clusters.push('fastest_growing');
  }
  if (card.compatibilityScore >= 72) clusters.push('most_compatible');

  return clusters.length > 0 ? clusters : ['most_compatible'];
}
