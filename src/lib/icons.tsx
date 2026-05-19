'use client';

import {
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  FileUser,
  FolderKanban,
  Globe,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export const iconMap = {
  globe: Globe,
  'book-open': BookOpen,
  briefcase: Briefcase,
  building: Building2,
  'bar-chart': BarChart3,
  search: Search,
  rocket: Rocket,
  settings: Settings,
  sparkles: Sparkles,
  target: Target,
  'trending-up': TrendingUp,
  award: Award,
  'folder-kanban': FolderKanban,
  'file-user': FileUser,
} as const;

export type IconName = keyof typeof iconMap;

export function resolveIcon(name: IconName): LucideIcon {
  return iconMap[name];
}
