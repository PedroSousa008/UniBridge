import {
  buildBehavioralProfile,
  buildBestNextStep,
  buildDailyGuidance,
  buildForecasts,
  buildMentorDashboard,
  buildMotivations,
  buildOpportunityFeed,
  buildStrategyRecommendations,
  buildTimeline,
  buildWeaknesses,
  MENTOR_CONVERSATION_STARTERS,
  runMentorConversation,
  type BehavioralTrait,
  type ForecastItem,
  type MentorDashboard,
  type MentorInsight,
  type StrategyRecommendation,
  type TimelineGoal,
  type WeaknessItem,
} from '@/lib/career/mentor-intelligence';
import { buildStudentProfile } from '@/lib/student/student-career-paths';
import { loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import {
  loadStudentCompatibilityHub,
  type CompatibilityScoreItem,
} from '@/lib/student/student-compatibility-hub';

export interface CareerMentorHub {
  dashboard: MentorDashboard;
  dailyGuidance: MentorInsight[];
  bestNextStep: string;
  strategyRecommendations: StrategyRecommendation[];
  weaknesses: WeaknessItem[];
  motivations: MentorInsight[];
  forecasts: ForecastItem[];
  timeline: TimelineGoal[];
  opportunityFeed: CompatibilityScoreItem[];
  goals: {
    id: string;
    roleTitle: string;
    companyName: string | null;
    compatibility: number;
    isPrimary: boolean;
  }[];
  behavioralProfile: BehavioralTrait[];
  liveUpdates: { label: string; delta: number }[];
  conversationStarters: string[];
  hasCompanyData: boolean;
  serverTime: string;
}

export async function loadStudentCareerMentorHub(userId: string): Promise<CareerMentorHub> {
  const [profile, pathsHub, compatHub] = await Promise.all([
    buildStudentProfile(userId),
    loadStudentCareerPathsHub(userId),
    loadStudentCompatibilityHub(userId),
  ]);

  return {
    dashboard: buildMentorDashboard(profile, compatHub, pathsHub),
    dailyGuidance: buildDailyGuidance(profile, compatHub, pathsHub),
    bestNextStep: buildBestNextStep(profile, compatHub, pathsHub),
    strategyRecommendations: buildStrategyRecommendations(profile, compatHub, pathsHub),
    weaknesses: buildWeaknesses(profile, compatHub, pathsHub),
    motivations: buildMotivations(profile, compatHub, pathsHub),
    forecasts: buildForecasts(profile, compatHub, pathsHub),
    timeline: buildTimeline(profile, pathsHub),
    opportunityFeed: buildOpportunityFeed(compatHub),
    goals: pathsHub.targets,
    behavioralProfile: buildBehavioralProfile(profile),
    liveUpdates: compatHub.liveDeltas,
    conversationStarters: MENTOR_CONVERSATION_STARTERS,
    hasCompanyData: compatHub.hasCompanyData,
    serverTime: new Date().toISOString(),
  };
}

export { runMentorConversation };
