'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BadgeCheck,
  Briefcase,
  Download,
  Eye,
  GraduationCap,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ProfileHub } from '@/lib/student/student-profile-hub';
import {
  formatVisibilityLabels,
  toggleVisibilitySelection,
  type ProfileVisibility,
  type VisibilitySectionKey,
} from '@/lib/career/profile-intelligence';
import { ProgressRing } from '@/components/student/home/progress-ring';
import { ImageUpload } from '@/components/ui/image-upload';

export function ProfileCommandCenter({ initialHub }: { initialHub: ProfileHub }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [hub, setHub] = useState(initialHub);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [form, setForm] = useState({
    name: initialHub.editable.name,
    image: initialHub.editable.image ?? '',
    headline: initialHub.editable.headline,
    bio: initialHub.editable.bio,
    age: initialHub.editable.age?.toString() ?? '',
    linkedIn: initialHub.editable.linkedIn,
    portfolioUrl: initialHub.editable.portfolioUrl,
    phone: initialHub.editable.phone,
    personalLocation: initialHub.editable.personalLocation,
    languages: initialHub.editable.languages.join(', '),
    interests: initialHub.editable.interests.join(', '),
    industries: initialHub.careerInterests.industries.join(', '),
    roles: initialHub.careerInterests.roles.join(', '),
    goals: initialHub.careerInterests.goals.join(', '),
    dreamCompanies: initialHub.careerInterests.dreamCompanies.join(', '),
  });
  const [newProject, setNewProject] = useState({ title: '', description: '', linkUrl: '', tags: '' });
  const [openTo, setOpenTo] = useState(hub.openTo);
  const [visibility, setVisibility] = useState<Record<string, ProfileVisibility[]>>(hub.visibility);

  function toggleVisibilitySection(sectionKey: VisibilitySectionKey, audienceId: ProfileVisibility) {
    setVisibility((prev) => ({
      ...prev,
      [sectionKey]: toggleVisibilitySelection(prev[sectionKey] ?? [], audienceId),
    }));
  }

  const split = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    const res = await fetch('/api/student/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        image: form.image || null,
        headline: form.headline,
        bio: form.bio,
        age: form.age ? parseInt(form.age, 10) : null,
        linkedIn: form.linkedIn,
        portfolioUrl: form.portfolioUrl,
        phone: form.phone,
        personalLocation: form.personalLocation,
        languages: split(form.languages),
        interests: split(form.interests),
        careerIndustries: split(form.industries),
        careerRoles: split(form.roles),
        careerGoals: split(form.goals),
        dreamCompanies: split(form.dreamCompanies),
        ...openTo,
        ...visibility,
      }),
    });
    if (res.ok) {
      setHub(await res.json());
      setEditing(false);
      await updateSession();
      router.refresh();
    }
    setSaving(false);
  }, [form, openTo, visibility, router, updateSession]);

  async function addProject() {
    if (!newProject.title.trim()) return;
    setSaving(true);
    const res = await fetch('/api/student/profile/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newProject.title,
        description: newProject.description,
        linkUrl: newProject.linkUrl,
        tags: split(newProject.tags),
      }),
    });
    if (res.ok) {
      setHub(await res.json());
      setShowProject(false);
      setNewProject({ title: '', description: '', linkUrl: '', tags: '' });
    }
    setSaving(false);
  }

  const chartData = hub.analytics.compatibilityTrend.map((p) => ({ name: p.label, score: p.value }));

  return (
    <div className="space-y-10 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-6">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-white/80 bg-muted shadow-lg dark:border-slate-800">
              {hub.hero.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hub.hero.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-light text-muted-foreground">
                  {hub.hero.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-3xl font-semibold tracking-tight">{hub.hero.name}</h2>
                <Badge variant="secondary">Age {hub.hero.age}</Badge>
                {hub.hero.universitySynced && (
                  <Badge className="gap-1 bg-emerald-600/90">
                    <BadgeCheck className="h-3 w-3" />
                    Verified student
                  </Badge>
                )}
              </div>
              <p className="text-lg text-violet-700 dark:text-violet-300">{hub.hero.headline}</p>
              <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  {hub.hero.program} · {hub.hero.universityName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {hub.hero.location}
                </span>
              </p>
              {hub.hero.bio ? <p className="max-w-xl text-sm leading-relaxed">{hub.hero.bio}</p> : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {hub.openToOptions.map((opt) =>
                  hub.openTo[opt.id] ? (
                    <Badge key={opt.id} variant="outline" className="text-xs">
                      {opt.label}
                    </Badge>
                  ) : null
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <ProgressRing value={hub.strength.total} size={100} stroke={8} label={`${hub.strength.total}%`} />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile strength</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit identity
            </Button>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">At a glance</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {hub.quickStats.map((s) => (
            <Link
              key={s.id}
              href={s.href ?? '#'}
              className="rounded-2xl border bg-card p-4 transition hover:border-violet-500/40 hover:shadow-md"
            >
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Strength + verified */}
        <section className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border p-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-violet-500" />
              Profile completion
            </p>
            <div className="space-y-3">
              {hub.strength.items.map((item) => (
                <div key={item.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{item.label}</span>
                    <span>{item.score}%</span>
                  </div>
                  <Progress value={item.score} className="h-1.5" />
                </div>
              ))}
            </div>
            {hub.strength.nextActions.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {hub.strength.nextActions.map((a) => (
                  <li key={a}>→ {a}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4" />
              Verified identity
            </p>
            <div className="space-y-2">
              {hub.verified.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    'flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                    v.verified ? 'border-emerald-500/30 bg-emerald-500/5' : 'opacity-60'
                  )}
                >
                  <div>
                    <p className="font-medium">{v.label}</p>
                    <p className="text-xs text-muted-foreground">{v.description}</p>
                  </div>
                  {v.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Career interests */}
          <section className="rounded-2xl border p-6">
            <p className="mb-4 flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-violet-500" />
              Career interests
              <span className="text-xs font-normal text-muted-foreground">— powers Compatibility, Mentor & Opportunities</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Industries', items: hub.careerInterests.industries },
                { label: 'Roles', items: hub.careerInterests.roles },
                { label: 'Goals', items: hub.careerInterests.goals },
                { label: 'Dream companies', items: hub.careerInterests.dreamCompanies },
              ].map((block) => (
                <div key={block.label}>
                  <p className="text-xs text-muted-foreground">{block.label}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {block.items.length > 0 ? (
                      block.items.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Add in Edit identity</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {hub.ecosystemLinks.map((l) => (
                <Button key={l.href} variant="ghost" size="sm" asChild>
                  <Link href={l.href}>{l.label}</Link>
                </Button>
              ))}
            </div>
          </section>

          {/* Skills snapshot */}
          <section className="rounded-2xl border p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium">Skills snapshot</p>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/career/skills">View all</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {hub.skillsSnapshot.map((s) => (
                <div key={s.id} className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{s.name}</p>
                    {s.verified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <Progress value={s.level} className="mt-2 h-1.5" />
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{s.growth} growth</p>
                </div>
              ))}
              {hub.skillsSnapshot.length === 0 && (
                <p className="text-sm text-muted-foreground sm:col-span-2">Track skills in Skills Hub</p>
              )}
            </div>
          </section>

          {/* Experience timeline */}
          <section className="rounded-2xl border p-6">
            <p className="mb-4 text-sm font-medium">Experience timeline</p>
            <div className="relative ml-3 border-l border-dashed pl-6">
              {hub.experienceTimeline.map((item) => (
                <div key={item.id} className="relative mb-6 last:mb-0">
                  <span className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full border-2 border-violet-500 bg-background" />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {item.kind}
                      </Badge>
                      {item.verified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.period}</p>
                </div>
              ))}
              {hub.experienceTimeline.length === 0 && (
                <p className="text-sm text-muted-foreground">Your journey will appear as you engage with internships and startups.</p>
              )}
            </div>
          </section>

          {/* Projects */}
          <section className="rounded-2xl border p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium">Portfolio & projects</p>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowProject(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add project
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {hub.projects.map((p) => (
                <div key={p.id} className="rounded-xl border p-4">
                  <p className="font-medium">{p.title}</p>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  {p.linkUrl && (
                    <a href={p.linkUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-violet-600 hover:underline">
                      View project →
                    </a>
                  )}
                </div>
              ))}
            </div>
            {hub.projects.length === 0 && !showProject && (
              <p className="text-sm text-muted-foreground">Showcase case studies, startups, and achievements.</p>
            )}
          </section>

          {/* Achievements */}
          <section className="rounded-2xl border p-6">
            <p className="mb-4 text-sm font-medium">Achievements & milestones</p>
            <div className="flex flex-wrap gap-2">
              {hub.achievements.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'rounded-xl border px-4 py-3',
                    a.verified ? 'border-amber-500/30 bg-amber-500/5' : ''
                  )}
                >
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Networking + analytics + activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border p-6 lg:col-span-1">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Networking
          </p>
          <ul className="space-y-2 text-sm">
            <li>Events attended: {hub.networking.eventsAttended}</li>
            <li>Recruiter connections: {hub.networking.recruitersConnected}</li>
            <li>Startup collaborators: {hub.networking.startupCollaborators}</li>
          </ul>
          {hub.networking.companiesInteracted.length > 0 && (
            <div className="mt-4 space-y-1">
              {hub.networking.companiesInteracted.map((c) => (
                <p key={c.name} className="text-xs text-muted-foreground">
                  {c.name} · {c.count} interaction{c.count > 1 ? 's' : ''}
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border p-6 lg:col-span-2">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4" />
            Profile analytics
          </p>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Profile views', value: hub.analytics.profileViews },
              { label: 'Recruiter views', value: hub.analytics.recruiterViews },
              { label: 'Company interactions', value: hub.analytics.companyInteractions },
              { label: 'CV downloads', value: hub.analytics.cvDownloads },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-2xl font-semibold">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
          {chartData.length > 0 && (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="compat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#8b5cf6" fill="url(#compat)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Activity feed */}
      <section className="rounded-2xl border p-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Recent activity</p>
        <ul className="space-y-2">
          {hub.activityFeed.map((a) => (
            <li key={a.id} className="flex justify-between text-sm border-b border-dashed pb-2 last:border-0">
              <span>{a.label}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(a.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </li>
          ))}
          {hub.activityFeed.length === 0 && <li className="text-sm text-muted-foreground">No recent activity yet</li>}
        </ul>
      </section>

      {/* Export */}
      <section className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2" asChild>
          <a href="/api/student/profile/export?format=profile" target="_blank" rel="noreferrer">
            <Download className="h-4 w-4" />
            Export profile PDF
          </a>
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <a href="/api/student/profile/export?format=cv" target="_blank" rel="noreferrer">
            <Briefcase className="h-4 w-4" />
            Export CV
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/student/career/cv">CV Builder</Link>
        </Button>
      </section>

      {/* Edit drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-lg flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <p className="font-semibold">Edit professional identity</p>
              <button type="button" onClick={() => setEditing(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 p-6">
              <ImageUpload
                label="Profile photo"
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                folder="profile"
                hint="This photo appears on your profile, applications, and what companies see across UniBridge."
              />
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Professional headline</label>
                <Input
                  placeholder="Aspiring Product Manager | Startup Enthusiast"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Bio</label>
                <textarea
                  className="mt-1 w-full min-h-[80px] rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Age</label>
                  <Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Location (personal)</label>
                  <Input value={form.personalLocation} onChange={(e) => setForm({ ...form, personalLocation: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">LinkedIn</label>
                <Input value={form.linkedIn} onChange={(e) => setForm({ ...form, linkedIn: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Portfolio URL</label>
                <Input value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Roles (comma-separated)</label>
                <Input value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Industries</label>
                <Input value={form.industries} onChange={(e) => setForm({ ...form, industries: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Dream companies</label>
                <Input value={form.dreamCompanies} onChange={(e) => setForm({ ...form, dreamCompanies: e.target.value })} />
              </div>

              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-2">Open to</p>
              {hub.openToOptions.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={openTo[opt.id] ?? false}
                    onChange={(e) => setOpenTo({ ...openTo, [opt.id]: e.target.checked })}
                  />
                  {opt.label}
                </label>
              ))}

              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-2">Visibility</p>
              <p className="text-xs text-muted-foreground">
                Select one or more audiences per section. Private hides from everyone else; other options can be combined.
              </p>
              {hub.visibilitySections.map(({ key, label }) => {
                const selected = visibility[key] ?? [];
                return (
                  <div key={key} className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-xs font-medium text-foreground">{label}</label>
                      <span className="text-[10px] text-muted-foreground">
                        {formatVisibilityLabels(selected)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hub.visibilityOptions.map((opt) => {
                        const active = selected.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            title={opt.description}
                            onClick={() => toggleVisibilitySection(key, opt.id)}
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-xs transition',
                              active
                                ? 'border-violet-500 bg-violet-500/15 text-violet-800 dark:text-violet-200'
                                : 'border-transparent bg-background hover:border-muted-foreground/30'
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t p-4">
              <Button className="w-full" onClick={() => void saveProfile()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save identity'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
            <p className="mb-4 font-semibold">Add project</p>
            <div className="space-y-3">
              <Input placeholder="Title" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} />
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[60px]"
                placeholder="Description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
              <Input placeholder="Link URL" value={newProject.linkUrl} onChange={(e) => setNewProject({ ...newProject, linkUrl: e.target.value })} />
              <Input placeholder="Tags (comma-separated)" value={newProject.tags} onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowProject(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => void addProject()} disabled={saving}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
