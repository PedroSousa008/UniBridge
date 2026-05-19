'use client';

import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  MessageSquare,
  Megaphone,
  Notebook,
  UserCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ModuleGrid } from '@/components/layout/module-grid';
import { useI18n } from '@/lib/i18n/context';

export function StudentAcademicsClient() {
  const { tr } = useI18n();

  const modules = [
    { href: '/student/academics/subjects', label: tr('student.academics.subjects'), description: 'Your enrolled subjects and teachers', icon: BookOpen },
    { href: '/student/academics/gradebook', label: tr('student.academics.gradebook'), description: tr('common.comingSoon'), icon: GraduationCap },
    { href: '/student/academics/assignments', label: tr('student.academics.assignments'), description: tr('common.comingSoon'), icon: ClipboardList },
    { href: '/student/academics/exams', label: tr('student.academics.exams'), description: tr('common.comingSoon'), icon: Notebook },
    { href: '/student/academics/calendar', label: tr('student.academics.calendar'), description: tr('common.comingSoon'), icon: Calendar },
    { href: '/student/academics/schedule', label: tr('student.academics.schedule'), description: tr('common.comingSoon'), icon: Calendar },
    { href: '/student/academics/documents', label: tr('student.academics.documents'), description: tr('common.comingSoon'), icon: FileText },
    { href: '/student/academics/attendance', label: tr('student.academics.attendance'), description: tr('common.comingSoon'), icon: UserCheck },
    { href: '/student/academics/announcements', label: tr('student.academics.announcements'), description: tr('common.comingSoon'), icon: Megaphone },
    { href: '/student/academics/messages', label: tr('student.academics.messages'), description: tr('common.comingSoon'), icon: MessageSquare },
    { href: '/student/academics/resources', label: tr('student.academics.resources'), description: tr('common.comingSoon'), icon: BookOpen },
  ];

  return (
    <div>
      <PageHeader
        title={tr('student.academics.title')}
        subtitle={tr('student.academics.subtitle')}
      />
      <ModuleGrid items={modules} />
    </div>
  );
}
