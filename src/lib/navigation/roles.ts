import type { LucideIcon } from 'lucide-react';
import {
  Home,
  GraduationCap,
  Briefcase,
  Rocket,
  User,
  BookOpen,
  ClipboardList,
  Users,
  MessageSquare,
  Building2,
  Search,
  Target,
  BarChart3,
  Kanban,
  CalendarDays,
  Globe,
  Sparkles,
  Settings,
  LayoutTemplate,
} from 'lucide-react';

export interface RoleNavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

export const studentNav: RoleNavItem[] = [
  { href: '/student/home', labelKey: 'student.nav.home', icon: Home },
  { href: '/student/academics', labelKey: 'student.nav.academics', icon: GraduationCap },
  { href: '/student/career', labelKey: 'student.nav.career', icon: Briefcase },
  { href: '/student/startup', labelKey: 'student.nav.startup', icon: Rocket },
  { href: '/student/profile', labelKey: 'student.nav.profile', icon: User },
];

export const teacherNav: RoleNavItem[] = [
  { href: '/teacher/home', labelKey: 'teacher.nav.home', icon: Home },
  { href: '/teacher/classes', labelKey: 'teacher.nav.classes', icon: BookOpen },
  { href: '/teacher/workspace', labelKey: 'teacher.nav.workspace', icon: ClipboardList },
  { href: '/teacher/students', labelKey: 'teacher.nav.students', icon: Users },
  { href: '/teacher/communication', labelKey: 'teacher.nav.communication', icon: MessageSquare },
  { href: '/teacher/profile', labelKey: 'teacher.nav.profile', icon: User },
];

export const universityNav: RoleNavItem[] = [
  { href: '/university/overview', labelKey: 'university.nav.overview', icon: Home },
  { href: '/university/academics', labelKey: 'university.nav.academics', icon: GraduationCap },
  { href: '/university/career', labelKey: 'university.nav.career', icon: Building2 },
  { href: '/university/innovation', labelKey: 'university.nav.innovation', icon: Sparkles },
  { href: '/university/profile', labelKey: 'university.nav.profile', icon: User },
];

export const companyNav: RoleNavItem[] = [
  { href: '/company/home', labelKey: 'company.nav.home', icon: Home },
  { href: '/company/presence', labelKey: 'company.nav.presence', icon: LayoutTemplate },
  { href: '/company/talent', labelKey: 'company.nav.talent', icon: Search },
  { href: '/company/pipeline', labelKey: 'company.nav.pipeline', icon: Kanban },
  { href: '/company/opportunities', labelKey: 'company.nav.opportunities', icon: Target },
  { href: '/company/startups', labelKey: 'company.nav.startups', icon: Rocket },
  { href: '/company/insights', labelKey: 'company.nav.insights', icon: BarChart3 },
  { href: '/company/events', labelKey: 'company.nav.events', icon: CalendarDays },
  { href: '/company/profile', labelKey: 'company.nav.profile', icon: User },
];

export const ownerNav: RoleNavItem[] = [
  { href: '/owner/ecosystem', labelKey: 'owner.nav.ecosystem', icon: Globe },
  { href: '/owner/universities', labelKey: 'owner.nav.universities', icon: Building2 },
  { href: '/owner/talent', labelKey: 'owner.nav.talent', icon: Rocket },
  { href: '/owner/business', labelKey: 'owner.nav.business', icon: BarChart3 },
  { href: '/owner/control', labelKey: 'owner.nav.control', icon: Settings },
];
