export type RequirementType =
  | 'academic'
  | 'skill'
  | 'experience'
  | 'language'
  | 'availability'
  | 'behavioral';

export type RequirementWeight = 'critical' | 'important' | 'bonus';

export type ValidationSource =
  | 'verified'
  | 'university_verified'
  | 'self_declared'
  | 'ai_inferred'
  | 'missing_data';

export const REQUIREMENT_TYPE_META: Record<
  RequirementType,
  { label: string; description: string }
> = {
  academic: {
    label: 'Academic',
    description: 'GPA, degree, subjects, university verification',
  },
  skill: {
    label: 'Skill',
    description: 'Verified skills, certifications, projects',
  },
  experience: {
    label: 'Experience',
    description: 'Internships, startups, leadership, events',
  },
  language: {
    label: 'Language',
    description: 'Verified or declared language proficiency',
  },
  availability: {
    label: 'Availability',
    description: 'Internship timing and work preferences',
  },
  behavioral: {
    label: 'Behavioral',
    description: 'Mindset and activity signals across UniBridge',
  },
};

export const WEIGHT_OPTIONS: { id: RequirementWeight; label: string; score: number }[] = [
  { id: 'critical', label: 'Critical', score: 10 },
  { id: 'important', label: 'Important', score: 7 },
  { id: 'bonus', label: 'Bonus', score: 4 },
];

export const VALIDATION_SOURCE_META: Record<
  ValidationSource,
  { label: string; short: string }
> = {
  verified: { label: 'Verified', short: 'Verified' },
  university_verified: { label: 'University verified', short: 'Uni verified' },
  self_declared: { label: 'Self-declared', short: 'Self-declared' },
  ai_inferred: { label: 'AI inferred', short: 'AI inferred' },
  missing_data: { label: 'Missing data', short: 'Missing' },
};

export interface RequirementTemplate {
  id: string;
  name: string;
  type: RequirementType;
  category: string;
  defaultValidation: ValidationSource;
  defaultWeight: RequirementWeight;
  tagId?: string;
}

export const REQUIREMENT_TEMPLATES: RequirementTemplate[] = [
  { id: 'gpa_14', name: 'Minimum GPA 14+', type: 'academic', category: 'Performance', defaultValidation: 'university_verified', defaultWeight: 'critical', tagId: 'gpa_14' },
  { id: 'gpa_15', name: 'Minimum GPA 15+', type: 'academic', category: 'Performance', defaultValidation: 'university_verified', defaultWeight: 'critical', tagId: 'gpa_15' },
  { id: 'specific_degree', name: 'Specific degree program', type: 'academic', category: 'Degree', defaultValidation: 'university_verified', defaultWeight: 'important' },
  { id: 'subjects_completed', name: 'Core subjects completed', type: 'academic', category: 'Curriculum', defaultValidation: 'university_verified', defaultWeight: 'important' },
  { id: 'excel', name: 'Excel / spreadsheets', type: 'skill', category: 'Technical', defaultValidation: 'verified', defaultWeight: 'important', tagId: 'excel' },
  { id: 'python', name: 'Python', type: 'skill', category: 'Technical', defaultValidation: 'verified', defaultWeight: 'important' },
  { id: 'communication', name: 'Strong communication', type: 'skill', category: 'Soft skills', defaultValidation: 'ai_inferred', defaultWeight: 'important', tagId: 'communication' },
  { id: 'financial_analysis', name: 'Financial analysis', type: 'skill', category: 'Domain', defaultValidation: 'verified', defaultWeight: 'important' },
  { id: 'leadership_skill', name: 'Leadership', type: 'skill', category: 'Soft skills', defaultValidation: 'ai_inferred', defaultWeight: 'bonus', tagId: 'leadership' },
  { id: 'internship_exp', name: 'Prior internships', type: 'experience', category: 'Work', defaultValidation: 'verified', defaultWeight: 'important', tagId: 'internship_exp' },
  { id: 'startup_exp', name: 'Startup experience', type: 'experience', category: 'Innovation', defaultValidation: 'verified', defaultWeight: 'important', tagId: 'startup_exp' },
  { id: 'leadership_roles', name: 'Leadership roles', type: 'experience', category: 'Leadership', defaultValidation: 'ai_inferred', defaultWeight: 'important', tagId: 'leadership' },
  { id: 'volunteering', name: 'Volunteering', type: 'experience', category: 'Impact', defaultValidation: 'self_declared', defaultWeight: 'bonus' },
  { id: 'event_participation', name: 'Event participation', type: 'experience', category: 'Ecosystem', defaultValidation: 'verified', defaultWeight: 'bonus', tagId: 'networking' },
  { id: 'english', name: 'English proficiency', type: 'language', category: 'Language', defaultValidation: 'self_declared', defaultWeight: 'critical', tagId: 'fluent_english' },
  { id: 'portuguese', name: 'Portuguese', type: 'language', category: 'Language', defaultValidation: 'self_declared', defaultWeight: 'important' },
  { id: 'spanish', name: 'Spanish', type: 'language', category: 'Language', defaultValidation: 'self_declared', defaultWeight: 'bonus' },
  { id: 'immediate', name: 'Immediate availability', type: 'availability', category: 'Timing', defaultValidation: 'self_declared', defaultWeight: 'critical', tagId: 'availability' },
  { id: 'summer_intern', name: 'Summer internship', type: 'availability', category: 'Timing', defaultValidation: 'self_declared', defaultWeight: 'important' },
  { id: 'part_time', name: 'Part-time availability', type: 'availability', category: 'Timing', defaultValidation: 'self_declared', defaultWeight: 'important' },
  { id: 'analytical', name: 'Analytical mindset', type: 'behavioral', category: 'Mindset', defaultValidation: 'ai_inferred', defaultWeight: 'important', tagId: 'analytical' },
  { id: 'entrepreneurial', name: 'Entrepreneurial thinking', type: 'behavioral', category: 'Mindset', defaultValidation: 'ai_inferred', defaultWeight: 'bonus' },
  { id: 'creativity', name: 'Creativity', type: 'behavioral', category: 'Mindset', defaultValidation: 'ai_inferred', defaultWeight: 'bonus' },
  { id: 'discipline', name: 'Discipline', type: 'behavioral', category: 'Mindset', defaultValidation: 'ai_inferred', defaultWeight: 'important' },
];

export const PREFERRED_QUALITY_TEMPLATES: RequirementTemplate[] = [
  { id: 'pref_startup_founder', name: 'Startup Founder', type: 'experience', category: 'Innovation', defaultValidation: 'verified', defaultWeight: 'bonus', tagId: 'startup_exp' },
  { id: 'pref_international', name: 'International Experience', type: 'experience', category: 'Global', defaultValidation: 'verified', defaultWeight: 'bonus', tagId: 'erasmus' },
  { id: 'pref_networking', name: 'Networking Active', type: 'behavioral', category: 'Engagement', defaultValidation: 'ai_inferred', defaultWeight: 'bonus', tagId: 'networking' },
  { id: 'pref_public_speaking', name: 'Public Speaking', type: 'skill', category: 'Communication', defaultValidation: 'ai_inferred', defaultWeight: 'bonus' },
  { id: 'pref_innovation', name: 'Innovation Competitions', type: 'experience', category: 'Innovation', defaultValidation: 'verified', defaultWeight: 'bonus' },
  { id: 'pref_fast_learner', name: 'Fast Learner', type: 'behavioral', category: 'Growth', defaultValidation: 'ai_inferred', defaultWeight: 'bonus' },
  { id: 'pref_research', name: 'Research Experience', type: 'academic', category: 'Research', defaultValidation: 'university_verified', defaultWeight: 'bonus' },
  { id: 'pref_events', name: 'Event Participation', type: 'experience', category: 'Ecosystem', defaultValidation: 'verified', defaultWeight: 'bonus', tagId: 'networking' },
  { id: 'pref_leadership_potential', name: 'Leadership Potential', type: 'behavioral', category: 'Leadership', defaultValidation: 'ai_inferred', defaultWeight: 'bonus', tagId: 'leadership' },
  { id: 'pref_portfolio', name: 'Strong Portfolio', type: 'skill', category: 'Portfolio', defaultValidation: 'verified', defaultWeight: 'bonus' },
];

export function templateById(id: string): RequirementTemplate | undefined {
  return [...REQUIREMENT_TEMPLATES, ...PREFERRED_QUALITY_TEMPLATES].find((t) => t.id === id);
}
