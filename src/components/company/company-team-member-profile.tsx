'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Linkedin,
  Loader2,
  Mail,
  MessageCircle,
  Trash2,
  UserCircle,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SlidePanel } from '@/components/ui/slide-panel';
import type { CompanyTeamMemberProfile } from '@/lib/company/company-presence-people';

const MEMBER_TYPES = [
  { id: 'employee', label: 'Employee' },
  { id: 'mentor', label: 'Mentor' },
  { id: 'recruiter', label: 'Recruiter' },
  { id: 'founder', label: 'Founder' },
  { id: 'leadership', label: 'Leadership' },
];

export function CompanyTeamMemberProfileScreen({
  memberId,
  initialProfile,
  onBack,
  onDeleted,
  onUpdated,
}: {
  memberId: string;
  initialProfile?: CompanyTeamMemberProfile;
  onBack: () => void;
  onDeleted?: () => void;
  onUpdated?: (profile: CompanyTeamMemberProfile) => void;
}) {
  const [profile, setProfile] = useState<CompanyTeamMemberProfile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(!initialProfile);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: initialProfile?.name ?? '',
    roleTitle: initialProfile?.roleTitle ?? '',
    memberType: initialProfile?.memberType ?? 'employee',
    photoUrl: initialProfile?.photoUrl ?? '',
    age: initialProfile?.age != null ? String(initialProfile.age) : '',
    previousUniversity: initialProfile?.previousUniversity ?? '',
    degree: initialProfile?.degree ?? '',
    graduationYear: initialProfile?.graduationYear ?? '',
    bio: initialProfile?.bio ?? '',
    linkedInUrl: initialProfile?.linkedInUrl ?? '',
    mentoringAvailable: initialProfile?.mentoringAvailable ?? false,
    messagesAvailable: initialProfile?.messagesAvailable ?? false,
  });
  const hasProfileRef = useRef(Boolean(initialProfile));

  useEffect(() => {
    hasProfileRef.current = Boolean(profile);
  }, [profile]);

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent && !hasProfileRef.current) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const res = await fetch(`/api/company/presence/team/${memberId}`);
        if (res.ok) {
          const data = (await res.json()) as CompanyTeamMemberProfile;
          setProfile(data);
          onUpdated?.(data);
        } else {
          const body = await res.json().catch(() => ({}));
          if (!hasProfileRef.current) setProfile(null);
          setError((body.error as string) ?? 'Could not load this person.');
        }
      } catch {
        if (!hasProfileRef.current) setProfile(null);
        setError('Network error while loading profile.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [memberId, onUpdated]
  );

  useEffect(() => {
    void refresh(Boolean(initialProfile));
  }, [memberId, refresh, initialProfile]);

  useEffect(() => {
    if (!profile) return;
    setDraft({
      name: profile.name,
      roleTitle: profile.roleTitle ?? '',
      memberType: profile.memberType,
      photoUrl: profile.photoUrl ?? '',
      age: profile.age != null ? String(profile.age) : '',
      previousUniversity: profile.previousUniversity ?? '',
      degree: profile.degree ?? '',
      graduationYear: profile.graduationYear ?? '',
      bio: profile.bio ?? '',
      linkedInUrl: profile.linkedInUrl ?? '',
      mentoringAvailable: profile.mentoringAvailable,
      messagesAvailable: profile.messagesAvailable,
    });
  }, [profile]);

  async function save() {
    if (!draft.name.trim() || draft.name.trim().length < 2) return;
    setSaving(true);
    const res = await fetch(`/api/company/presence/team/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name.trim(),
        roleTitle: draft.roleTitle.trim() || null,
        memberType: draft.memberType,
        photoUrl: draft.photoUrl || null,
        age: draft.age ? Number(draft.age) : null,
        previousUniversity: draft.previousUniversity.trim() || null,
        degree: draft.degree.trim() || null,
        graduationYear: draft.graduationYear.trim() || null,
        bio: draft.bio.trim() || null,
        linkedInUrl: draft.linkedInUrl.trim() || null,
        mentoringAvailable: draft.mentoringAvailable,
        messagesAvailable: draft.messagesAvailable,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as CompanyTeamMemberProfile;
      setProfile(data);
      onUpdated?.(data);
      setEditOpen(false);
    }
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm('Remove this person from your company presence?')) return;
    setSaving(true);
    const res = await fetch(`/api/company/presence/team?id=${memberId}`, { method: 'DELETE' });
    if (res.ok) {
      onDeleted?.();
      onBack();
    }
    setSaving(false);
  }

  if (loading && !profile) {
    return (
      <div className="py-16 space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-muted" />
        <div className="h-48 rounded-3xl bg-muted" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm text-muted-foreground">{error ?? 'Person not found.'}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const isPositionHolder = profile.memberType === 'position_holder';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          People
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{profile.name}</span>
        {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
      </div>

      <section className="rounded-3xl border bg-gradient-to-br from-card via-card to-muted/30 p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="h-24 w-24 rounded-2xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="secondary" className="capitalize">
                {profile.memberType.replace(/_/g, ' ')}
              </Badge>
              {profile.departmentName ? (
                <Badge variant="outline">{profile.departmentName}</Badge>
              ) : null}
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">{profile.name}</h2>
            {profile.roleTitle ? (
              <p className="text-muted-foreground mt-1">{profile.roleTitle}</p>
            ) : null}
            {(profile.previousUniversity || profile.degree) && (
              <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 shrink-0" />
                {[profile.previousUniversity, profile.degree].filter(Boolean).join(' · ')}
                {profile.graduationYear ? ` (${profile.graduationYear})` : ''}
              </p>
            )}
            {profile.age ? (
              <p className="text-xs text-muted-foreground mt-1">Age {profile.age}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.mentoringAvailable ? (
                <Badge className="bg-brand/10 text-brand border-brand/30">Mentoring available</Badge>
              ) : null}
              {profile.messagesAvailable ? (
                <Badge variant="outline" className="gap-1">
                  <MessageCircle className="h-3 w-3" /> Open to messages
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        {profile.bio ? (
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground border-t pt-6">{profile.bio}</p>
        ) : null}
        {profile.linkedInUrl ? (
          <a
            href={profile.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-brand hover:underline"
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn profile
          </a>
        ) : null}
      </section>

      {profile.linkedRoles.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles at your company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.linkedRoles.map((r) => (
              <div key={r.id} className="rounded-xl border px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{r.title}</p>
                  {r.departmentName ? (
                    <p className="text-xs text-muted-foreground">{r.departmentName}</p>
                  ) : null}
                </div>
                <Badge variant={r.isFilled ? 'secondary' : 'outline'}>
                  {r.isFilled ? 'Filled' : 'Open'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!isPositionHolder ? (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit profile
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground self-center">
            Position holders are edited from the filled role panel.
          </p>
        )}
        {!isPositionHolder ? (
          <Button variant="ghost" className="text-rose-600" onClick={() => void remove()} disabled={saving}>
            <Trash2 className="h-4 w-4 mr-1" />
            Remove person
          </Button>
        ) : null}
      </div>

      <SlidePanel open={editOpen} onClose={() => setEditOpen(false)} title="Edit person">
        <div className="space-y-4">
          <ImageUpload
            label="Photo"
            value={draft.photoUrl}
            onChange={(url) => setDraft({ ...draft, photoUrl: url })}
            folder="company-team"
          />
          <div>
            <label className="text-xs text-muted-foreground">Full name *</label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Role / title</label>
            <Input
              value={draft.roleTitle}
              onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={draft.memberType}
              onChange={(e) => setDraft({ ...draft, memberType: e.target.value })}
            >
              {MEMBER_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">University</label>
              <Input
                value={draft.previousUniversity}
                onChange={(e) => setDraft({ ...draft, previousUniversity: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Degree</label>
              <Input value={draft.degree} onChange={(e) => setDraft({ ...draft, degree: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Bio</label>
            <textarea
              className="mt-1 w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">LinkedIn URL</label>
            <Input
              value={draft.linkedInUrl}
              onChange={(e) => setDraft({ ...draft, linkedInUrl: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.mentoringAvailable}
              onChange={(e) => setDraft({ ...draft, mentoringAvailable: e.target.checked })}
            />
            Offers mentoring
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.messagesAvailable}
              onChange={(e) => setDraft({ ...draft, messagesAvailable: e.target.checked })}
            />
            <Mail className="h-3.5 w-3.5" />
            Open to student messages
          </label>
          <Button className="w-full" onClick={() => void save()} disabled={saving || draft.name.trim().length < 2}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </SlidePanel>
    </div>
  );
}
