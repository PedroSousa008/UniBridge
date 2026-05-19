export const STARTUP_STAGES = [
  'Idea',
  'Prototype',
  'MVP',
  'Launched',
  'Revenue',
  'Growth',
] as const;

export const FOUNDER_ROLES = [
  'CEO',
  'CTO',
  'CMO',
  'COO',
  'CFO',
  'Designer',
  'Developer',
  'Product',
  'Other',
] as const;

export const REVENUE_MODELS = [
  'Subscription',
  'Marketplace',
  'Commission',
  'Ads',
  'One-time purchase',
  'SaaS',
  'Licensing',
  'Freemium',
  'Enterprise',
  'Other',
] as const;

export const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public on UniBridge' },
  { value: 'UNIVERSITY', label: 'University only' },
  { value: 'COMPANIES', label: 'Companies only' },
  { value: 'TEAM', label: 'Team only' },
  { value: 'OWNER', label: 'Founders only' },
  { value: 'PRIVATE', label: 'Private' },
] as const;

export const MEDIA_TYPES = [
  { value: 'screenshot', label: 'Product screenshot' },
  { value: 'mockup', label: 'Mockup' },
  { value: 'app_image', label: 'App image' },
  { value: 'demo_video', label: 'Demo video' },
  { value: 'pitch_deck', label: 'Pitch deck PDF' },
  { value: 'prototype', label: 'Prototype link' },
  { value: 'canva', label: 'Canva link' },
  { value: 'youtube', label: 'YouTube / Vimeo' },
  { value: 'github', label: 'GitHub' },
] as const;

export const MILESTONE_TEMPLATES = [
  { key: 'idea_defined', label: 'Idea defined' },
  { key: 'team_formed', label: 'Team formed' },
  { key: 'market_research', label: 'Market research done' },
  { key: 'prototype', label: 'Prototype created' },
  { key: 'mvp', label: 'MVP launched' },
  { key: 'first_users', label: 'First users' },
  { key: 'first_revenue', label: 'First revenue' },
  { key: 'first_partnership', label: 'First partnership' },
  { key: 'pitch_deck', label: 'Pitch deck ready' },
  { key: 'investor_meeting', label: 'Investor meeting' },
] as const;

export const TRACTION_METRICS = [
  { key: 'users', label: 'Users' },
  { key: 'waitlist', label: 'Waitlist' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'mrr', label: 'MRR' },
  { key: 'partnerships', label: 'Partnerships' },
  { key: 'pilots', label: 'Pilots' },
  { key: 'downloads', label: 'Downloads' },
  { key: 'social_followers', label: 'Social followers' },
  { key: 'active_customers', label: 'Active customers' },
  { key: 'growth_rate', label: 'Growth rate' },
] as const;

export const LOOKING_FOR_TYPES = [
  'cofounder',
  'developer',
  'designer',
  'marketer',
  'finance',
  'legal',
  'mentor',
  'investor',
  'university_support',
  'company_partner',
  'beta_testers',
  'intern',
] as const;

export const INTEREST_TYPES = [
  { value: 'join', label: 'Request to join' },
  { value: 'cofounder', label: 'Apply as cofounder' },
  { value: 'mentor', label: 'Offer mentorship' },
  { value: 'contact', label: 'Contact founder' },
  { value: 'company', label: 'Recommend to company' },
] as const;

export type SectionKey =
  | 'identity'
  | 'team'
  | 'pitch'
  | 'media'
  | 'milestones'
  | 'traction'
  | 'openings'
  | 'business'
  | 'market';
