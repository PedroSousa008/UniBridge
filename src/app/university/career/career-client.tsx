'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SectionTabs } from '@/components/university/section-tabs';
import { DataTable, type Column } from '@/components/university/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const TABS = [
  { id: 'partnerships', label: 'Partnerships' },
  { id: 'paths', label: 'Career paths' },
  { id: 'compatibility', label: 'Compatibility' },
  { id: 'internships', label: 'Internships' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'analytics', label: 'Analytics' },
];

export interface CareerPartnership {
  id: string;
  companyName: string;
  status: string;
  partnershipType: string | null;
  careerPathCount: number;
  contactEmail: string | null;
}

export interface CareerPathItem {
  id: string;
  roleTitle: string;
  companyName: string;
  industry: string | null;
  status: string;
  publishedAt: string | null;
}

export interface CompatibilityRow {
  id: string;
  studentName: string;
  targetRole: string;
  companyName: string | null;
  compatibility: number;
  pathTitle: string | null;
}

export interface CareerInternship {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  status: string;
}

export interface CareerChallenge {
  id: string;
  title: string;
  companyName: string;
  deadline: string | null;
  status: string;
}

export interface UniversityCareerClientProps {
  partnerships: CareerPartnership[];
  careerPaths: CareerPathItem[];
  compatibility: CompatibilityRow[];
  internships: CareerInternship[];
  challenges: CareerChallenge[];
  analytics: {
    publishedPaths: number;
    pendingPaths: number;
    avgCompatibility: number;
    activePartnerships: number;
  };
}

export function UniversityCareerClient({
  partnerships,
  careerPaths,
  compatibility,
  internships,
  challenges,
  analytics,
}: UniversityCareerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'partnerships');
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathActionId, setPathActionId] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
    if (searchParams.get('action') === 'add' && t === 'partnerships') {
      setAddCompanyOpen(true);
    }
  }, [searchParams]);

  const pendingPaths = useMemo(
    () => careerPaths.filter((p) => p.status === 'PENDING_APPROVAL' || p.status === 'APPROVED'),
    [careerPaths]
  );

  async function patchCareerPath(id: string, action: 'approve' | 'publish') {
    setPathActionId(id);
    setError(null);
    try {
      const res = await fetch(`/api/university/career-paths/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setPathActionId(null);
    }
  }

  const partnershipColumns: Column<CareerPartnership>[] = [
    { key: 'company', header: 'Company', cell: (r) => r.companyName },
    { key: 'type', header: 'Type', cell: (r) => r.partnershipType ?? '—' },
    {
      key: 'paths',
      header: 'Career paths',
      cell: (r) => r.careerPathCount,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant="secondary">{r.status}</Badge>,
    },
    { key: 'contact', header: 'Contact', cell: (r) => r.contactEmail ?? '—' },
  ];

  const compatibilityColumns: Column<CompatibilityRow>[] = [
    { key: 'student', header: 'Student', cell: (r) => r.studentName },
    { key: 'role', header: 'Target role', cell: (r) => r.targetRole },
    { key: 'company', header: 'Company', cell: (r) => r.companyName ?? '—' },
    { key: 'path', header: 'Published path', cell: (r) => r.pathTitle ?? '—' },
    {
      key: 'score',
      header: 'Compatibility',
      cell: (r) => `${Math.round(r.compatibility)}%`,
    },
  ];

  const internshipColumns: Column<CareerInternship>[] = [
    { key: 'title', header: 'Internship', cell: (r) => r.title },
    { key: 'company', header: 'Company', cell: (r) => r.companyName },
    { key: 'location', header: 'Location', cell: (r) => r.location ?? '—' },
    { key: 'status', header: 'Status', cell: (r) => r.status },
  ];

  const challengeColumns: Column<CareerChallenge>[] = [
    { key: 'title', header: 'Challenge', cell: (r) => r.title },
    { key: 'company', header: 'Company', cell: (r) => r.companyName },
    {
      key: 'deadline',
      header: 'Deadline',
      cell: (r) => (r.deadline ? new Date(r.deadline).toLocaleDateString() : '—'),
    },
    { key: 'status', header: 'Status', cell: (r) => r.status },
  ];

  return (
    <div>
      <PageHeader
        title="Career & partnerships"
        subtitle="Company relationships, career paths, compatibility, and employability."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTabs tabs={TABS} active={tab} onChange={setTab} className="flex-1 border-0 pb-0" />
        {tab === 'partnerships' ? (
          <Button size="sm" onClick={() => setAddCompanyOpen(true)}>
            <Plus className="h-4 w-4" />
            Add company
          </Button>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}

      {tab === 'partnerships' ? (
        <DataTable columns={partnershipColumns} data={partnerships} emptyMessage="No partnerships yet." />
      ) : null}

      {tab === 'paths' ? (
        <div className="space-y-4">
          {pendingPaths.length === 0 ? (
            <p className="text-sm text-muted-foreground">No career paths awaiting action.</p>
          ) : (
            pendingPaths.map((path) => (
              <Card key={path.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                  <div>
                    <p className="font-semibold">{path.roleTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {path.companyName}
                      {path.industry ? ` · ${path.industry}` : ''}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {path.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {path.status === 'PENDING_APPROVAL' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pathActionId === path.id}
                        onClick={() => patchCareerPath(path.id, 'approve')}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {path.status !== 'PUBLISHED' ? (
                      <Button
                        size="sm"
                        disabled={pathActionId === path.id}
                        onClick={() => patchCareerPath(path.id, 'publish')}
                      >
                        Publish
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {careerPaths.filter((p) => p.status === 'PUBLISHED').length > 0 ? (
            <div className="pt-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Published paths</p>
              <DataTable
                columns={[
                  { key: 'role', header: 'Role', cell: (r) => r.roleTitle },
                  { key: 'company', header: 'Company', cell: (r) => r.companyName },
                  {
                    key: 'published',
                    header: 'Published',
                    cell: (r) =>
                      r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : '—',
                  },
                ]}
                data={careerPaths.filter((p) => p.status === 'PUBLISHED')}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'compatibility' ? (
        <DataTable
          columns={compatibilityColumns}
          data={compatibility}
          emptyMessage="No compatibility data yet."
        />
      ) : null}

      {tab === 'internships' ? (
        <DataTable columns={internshipColumns} data={internships} emptyMessage="No internships." />
      ) : null}

      {tab === 'challenges' ? (
        <DataTable columns={challengeColumns} data={challenges} emptyMessage="No challenges." />
      ) : null}

      {tab === 'analytics' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Published paths', value: analytics.publishedPaths },
            { label: 'Pending approval', value: analytics.pendingPaths },
            { label: 'Avg. compatibility', value: `${analytics.avgCompatibility}%` },
            { label: 'Active partnerships', value: analytics.activePartnerships },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-6">
                <p className="text-3xl font-semibold">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              const fd = new FormData(e.currentTarget);
              try {
                const res = await fetch('/api/university/partnerships', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    companyName: fd.get('companyName'),
                    contactEmail: fd.get('contactEmail'),
                    contactName: fd.get('contactName'),
                    partnershipType: fd.get('partnershipType'),
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed');
                setAddCompanyOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Add company partnership
              </DialogTitle>
              <DialogDescription>
                Link a registered company account by contact email.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input name="companyName" placeholder="Company name" required />
              <Input name="contactEmail" type="email" placeholder="Company account email" required />
              <Input name="contactName" placeholder="Contact name" />
              <Input name="partnershipType" placeholder="Partnership type" />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Add partnership'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
