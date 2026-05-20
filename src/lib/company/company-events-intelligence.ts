export type EventTypeId =
  | 'recruiting'
  | 'networking'
  | 'workshop'
  | 'career_fair'
  | 'startup_pitch'
  | 'hackathon'
  | 'mentorship'
  | 'live_qa'
  | 'leadership'
  | 'product_demo'
  | 'founder_meetup'
  | 'partnership'
  | 'conference';

export interface EventTypeMeta {
  id: EventTypeId;
  label: string;
  color: string;
  gradient: string;
  description: string;
}

export const EVENT_TYPES: EventTypeMeta[] = [
  { id: 'recruiting', label: 'Recruiting Session', color: '#0f172a', gradient: 'from-slate-800 to-slate-600', description: 'Talent discovery and hiring conversations' },
  { id: 'networking', label: 'Networking Event', color: '#0891b2', gradient: 'from-cyan-600 to-cyan-400', description: 'Connect ambitious students with your ecosystem' },
  { id: 'workshop', label: 'Workshop', color: '#7c3aed', gradient: 'from-violet-600 to-violet-400', description: 'Skills-building with live participation' },
  { id: 'career_fair', label: 'Career Fair', color: '#059669', gradient: 'from-emerald-600 to-emerald-400', description: 'High-volume career exploration' },
  { id: 'startup_pitch', label: 'Startup Pitch', color: '#ea580c', gradient: 'from-orange-600 to-amber-400', description: 'Founder showcases and venture energy' },
  { id: 'hackathon', label: 'Hackathon', color: '#db2777', gradient: 'from-pink-600 to-rose-400', description: 'Build sprints and innovation bursts' },
  { id: 'mentorship', label: 'Mentorship Session', color: '#4f46e5', gradient: 'from-indigo-600 to-indigo-400', description: 'Guided growth with mentors' },
  { id: 'live_qa', label: 'Live Q&A', color: '#0284c7', gradient: 'from-sky-600 to-sky-400', description: 'Open dialogue with company leaders' },
  { id: 'leadership', label: 'Leadership Program', color: '#b45309', gradient: 'from-amber-700 to-amber-500', description: 'Future leaders development' },
  { id: 'product_demo', label: 'Product Demo', color: '#6366f1', gradient: 'from-indigo-500 to-violet-400', description: 'Show product vision and culture' },
  { id: 'founder_meetup', label: 'Founder Meetup', color: '#c026d3', gradient: 'from-fuchsia-600 to-purple-400', description: 'Startup OS community gathering' },
  { id: 'partnership', label: 'University Partnership', color: '#475569', gradient: 'from-slate-600 to-slate-400', description: 'Official collaboration with campus' },
  { id: 'conference', label: 'Conference', color: '#1e3a8a', gradient: 'from-blue-800 to-blue-500', description: 'Large-scale ecosystem summit' },
];

export function eventTypeMeta(type: string | null | undefined): EventTypeMeta {
  return EVENT_TYPES.find((t) => t.id === type) ?? EVENT_TYPES[1];
}

export interface EventSpeakerCard {
  id: string;
  name: string;
  role: string;
  company: string | null;
  university: string | null;
  image: string | null;
  bio: string | null;
  expertise: string[];
  networkingAvailable: boolean;
}

export interface EventEcosystemJson {
  goals?: string[];
  agenda?: { time: string; label: string }[];
  relatedOpportunityIds?: string[];
  attendanceMode?: 'manual' | 'qr' | 'auto' | 'checkin';
  futureSeriesLabel?: string;
}

export function parseSpeakers(val: unknown, companyName: string): EventSpeakerCard[] {
  if (!Array.isArray(val)) {
    if (typeof val === 'string' && val.trim()) {
      return val.split(',').map((name, i) => ({
        id: `sp-${i}`,
        name: name.trim(),
        role: 'Speaker',
        company: companyName,
        university: null,
        image: null,
        bio: null,
        expertise: [],
        networkingAvailable: true,
      }));
    }
    return [];
  }
  return val
    .filter((x) => x && typeof x === 'object')
    .map((x, i) => {
      const o = x as Record<string, unknown>;
      return {
        id: String(o.id ?? `sp-${i}`),
        name: String(o.name ?? 'Guest'),
        role: String(o.role ?? 'Speaker'),
        company: typeof o.company === 'string' ? o.company : companyName,
        university: typeof o.university === 'string' ? o.university : null,
        image: typeof o.image === 'string' ? o.image : null,
        bio: typeof o.bio === 'string' ? o.bio : null,
        expertise: Array.isArray(o.expertise) ? o.expertise.map(String) : [],
        networkingAvailable: o.networkingAvailable !== false,
      };
    });
}

export function parseEcosystemJson(val: unknown): EventEcosystemJson {
  if (!val || typeof val !== 'object') return {};
  const o = val as Record<string, unknown>;
  return {
    goals: Array.isArray(o.goals) ? o.goals.map(String) : undefined,
    agenda: Array.isArray(o.agenda)
      ? (o.agenda as { time?: string; label?: string }[]).map((a) => ({
          time: String(a.time ?? ''),
          label: String(a.label ?? ''),
        }))
      : undefined,
    relatedOpportunityIds: Array.isArray(o.relatedOpportunityIds)
      ? o.relatedOpportunityIds.map(String)
      : undefined,
    attendanceMode:
      o.attendanceMode === 'manual' ||
      o.attendanceMode === 'qr' ||
      o.attendanceMode === 'auto' ||
      o.attendanceMode === 'checkin'
        ? o.attendanceMode
        : 'manual',
    futureSeriesLabel: typeof o.futureSeriesLabel === 'string' ? o.futureSeriesLabel : undefined,
  };
}

export function buildEventAiRecommendations(input: {
  eventType: string;
  targetDegrees: string[];
  studentName: string;
  compatibility: number;
  hasStartup: boolean;
  leadershipScore: number;
}): string[] {
  const lines: string[] = [];
  const type = eventTypeMeta(input.eventType);
  if (input.compatibility >= 75) {
    lines.push(`${input.studentName} shows ${input.compatibility}% alignment — strong fit for ${type.label}.`);
  }
  if (input.eventType === 'leadership' && input.leadershipScore >= 70) {
    lines.push('Leadership profile matches this program — high engagement expected.');
  }
  if (input.eventType === 'startup_pitch' && input.hasStartup) {
    lines.push('Active founder — ideal for startup ecosystem events.');
  }
  if (input.eventType === 'networking') {
    lines.push('Networking indicators suggest high pre-event connection potential.');
  }
  if (input.targetDegrees.length > 0) {
    lines.push(`Target degrees: ${input.targetDegrees.slice(0, 3).join(', ')}.`);
  }
  return lines.slice(0, 2);
}

export function statusLabel(status: string): string {
  if (status === 'approved') return 'Live · Ecosystem visible';
  if (status === 'pending_approval') return 'Pending university approval';
  if (status === 'rejected') return 'Rejected';
  if (status === 'draft') return 'Draft';
  return status;
}
