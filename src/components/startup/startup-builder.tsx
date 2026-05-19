'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import { StartupPreview } from './startup-preview';
import {
  defaultBuilderState,
  type BuilderState,
} from './startup-builder-types';
import {
  FOUNDER_ROLES,
  LOOKING_FOR_TYPES,
  MEDIA_TYPES,
  REVENUE_MODELS,
  STARTUP_STAGES,
  VISIBILITY_OPTIONS,
} from '@/lib/startups/constants';
import { computeStartupReadiness } from '@/lib/startups/readiness';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function StartupBuilder({
  startupId,
  initial,
}: {
  startupId?: string;
  initial?: Partial<BuilderState>;
}) {
  const router = useRouter();
  const [state, setState] = useState<BuilderState>(() => defaultBuilderState(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const previewState = useMemo(() => {
    const mock = {
      name: state.identity.name,
      tagline: state.identity.tagline || null,
      logoUrl: state.identity.logoUrl || null,
      coverUrl: state.identity.coverUrl || null,
      industry: state.identity.industry || null,
      stage: state.identity.stage || null,
      website: state.identity.website || null,
      problem: state.pitch.problem || null,
      targetCustomer: state.pitch.targetCustomer || null,
      solution: state.pitch.solution || null,
      differentiator: state.pitch.differentiator || null,
      businessModelText: state.pitch.businessModel || null,
      visionOneLiner: state.pitch.vision || null,
      targetMarket: state.market.targetMarket || null,
      members: state.members,
      media: state.media,
      milestones: state.milestones,
      tractionMetrics: state.traction.map((t) => ({ value: t.value })),
      openings: state.openings,
    };
    const { readinessScore } = computeStartupReadiness(mock);
    return { ...state, readinessScore };
  }, [state]);

  async function handleSave() {
    if (!state.identity.name.trim()) {
      setError('Startup name is required');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      identity: state.identity,
      pitch: state.pitch,
      business: state.business,
      market: state.market,
      visibility: state.visibility,
      media: state.media.filter((m) => m.url.trim()),
      milestones: state.milestones,
      traction: state.traction,
      openings: state.openings.map((o) => ({
        ...o,
        skillsRequired: o.skillsRequired
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })),
      members: state.members,
    };

    try {
      let id = startupId;
      if (!id) {
        const res = await fetch('/api/startups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: state.identity.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create');
        id = data.startup.id;
      }

      const patch = await fetch(`/api/startups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!patch.ok) {
        const data = await patch.json();
        throw new Error(data.error || 'Failed to save');
      }

      router.push(`/student/startup/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={startupId ? 'Edit startup' : 'Create your startup'}
        subtitle="Build a premium venture profile with live preview."
      />

      <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
        <div>
          <Section title="1. Startup identity">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Startup name *"
                value={state.identity.name}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, name: e.target.value },
                  }))
                }
              />
              <Input
                placeholder="Tagline"
                value={state.identity.tagline}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, tagline: e.target.value },
                  }))
                }
              />
              <ImageUpload
                label="Logo"
                value={state.identity.logoUrl}
                onChange={(url) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, logoUrl: url },
                  }))
                }
                folder="startup-logo"
                aspect="square"
              />
              <ImageUpload
                label="Cover / hero banner"
                value={state.identity.coverUrl}
                onChange={(url) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, coverUrl: url },
                  }))
                }
                folder="startup-cover"
                aspect="banner"
                className="sm:col-span-2"
              />
              <Input
                placeholder="Website"
                value={state.identity.website}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, website: e.target.value },
                  }))
                }
              />
              <Input
                placeholder="Contact email"
                value={state.identity.contactEmail}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, contactEmail: e.target.value },
                  }))
                }
              />
              <Input
                placeholder="LinkedIn"
                value={state.identity.linkedIn}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, linkedIn: e.target.value },
                  }))
                }
              />
              <Input
                placeholder="Instagram"
                value={state.identity.instagram}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, instagram: e.target.value },
                  }))
                }
              />
              <Input
                placeholder="X / Twitter"
                value={state.identity.twitter}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, twitter: e.target.value },
                  }))
                }
              />
              <Input
                placeholder="Industry"
                value={state.identity.industry}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, industry: e.target.value },
                  }))
                }
              />
              <select
                className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                value={state.identity.stage}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, stage: e.target.value },
                  }))
                }
              >
                {STARTUP_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                placeholder="Founded"
                value={state.identity.foundedAt}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    identity: { ...s.identity, foundedAt: e.target.value },
                  }))
                }
              />
            </div>
          </Section>

          <Section title="2. Founder team">
            {state.members.map((m, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-3">
                <ImageUpload
                  label="Profile photo"
                  value={m.photoUrl ?? ''}
                  onChange={(url) => {
                    const members = [...state.members];
                    members[i] = { ...members[i], photoUrl: url };
                    setState((s) => ({ ...s, members }));
                  }}
                  folder="founder-photo"
                  aspect="square"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Email (invite) or leave if you"
                    value={m.email ?? ''}
                    onChange={(e) => {
                      const members = [...state.members];
                      members[i] = { ...members[i], email: e.target.value };
                      setState((s) => ({ ...s, members }));
                    }}
                  />
                  <select
                    className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                    value={m.role}
                    onChange={(e) => {
                      const members = [...state.members];
                      members[i] = { ...members[i], role: e.target.value };
                      setState((s) => ({ ...s, members }));
                    }}
                  >
                    {FOUNDER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Course"
                    value={m.course ?? ''}
                    onChange={(e) => {
                      const members = [...state.members];
                      members[i] = { ...members[i], course: e.target.value };
                      setState((s) => ({ ...s, members }));
                    }}
                  />
                  <Input
                    placeholder="LinkedIn"
                    value={m.linkedIn ?? ''}
                    onChange={(e) => {
                      const members = [...state.members];
                      members[i] = { ...members[i], linkedIn: e.target.value };
                      setState((s) => ({ ...s, members }));
                    }}
                  />
                </div>
                <TextArea
                  placeholder="Short bio"
                  value={m.bio ?? ''}
                  onChange={(v) => {
                    const members = [...state.members];
                    members[i] = { ...members[i], bio: v };
                    setState((s) => ({ ...s, members }));
                  }}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!m.isMainFounder}
                    onChange={(e) => {
                      const members = state.members.map((mem, j) => ({
                        ...mem,
                        isMainFounder: j === i ? e.target.checked : false,
                      }));
                      setState((s) => ({ ...s, members }));
                    }}
                  />
                  Main founder
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      members: s.members.filter((_, j) => j !== i),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  members: [...s.members, { role: 'Developer', email: '' }],
                }))
              }
            >
              <Plus className="h-4 w-4" /> Add founder
            </Button>
          </Section>

          <Section title="3. Startup pitch">
            <TextArea
              placeholder="What problem are you solving?"
              value={state.pitch.problem}
              onChange={(v) => setState((s) => ({ ...s, pitch: { ...s.pitch, problem: v } }))}
            />
            <TextArea
              placeholder="Who is the target customer?"
              value={state.pitch.targetCustomer}
              onChange={(v) =>
                setState((s) => ({ ...s, pitch: { ...s.pitch, targetCustomer: v } }))
              }
            />
            <TextArea
              placeholder="What is your solution?"
              value={state.pitch.solution}
              onChange={(v) => setState((s) => ({ ...s, pitch: { ...s.pitch, solution: v } }))}
            />
            <TextArea
              placeholder="Why now?"
              value={state.pitch.whyNow}
              onChange={(v) => setState((s) => ({ ...s, pitch: { ...s.pitch, whyNow: v } }))}
            />
            <TextArea
              placeholder="What makes it different?"
              value={state.pitch.differentiator}
              onChange={(v) =>
                setState((s) => ({ ...s, pitch: { ...s.pitch, differentiator: v } }))
              }
            />
            <TextArea
              placeholder="Business model"
              value={state.pitch.businessModel}
              onChange={(v) =>
                setState((s) => ({ ...s, pitch: { ...s.pitch, businessModel: v } }))
              }
            />
            <Input
              placeholder="Vision in one sentence"
              value={state.pitch.vision}
              onChange={(e) =>
                setState((s) => ({ ...s, pitch: { ...s.pitch, vision: e.target.value } }))
              }
            />
          </Section>

          <Section title="4. Visual pitch">
            {state.media.map((m, i) => {
              const isImageAsset = ['screenshot', 'mockup', 'app_image'].includes(m.type);
              return (
              <div key={i} className="space-y-3 rounded-xl border border-border/60 p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
                    value={m.type}
                    onChange={(e) => {
                      const media = [...state.media];
                      media[i] = { ...media[i], type: e.target.value };
                      setState((s) => ({ ...s, media }));
                    }}
                  >
                    {MEDIA_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Title"
                    value={m.title}
                    onChange={(e) => {
                      const media = [...state.media];
                      media[i] = { ...media[i], title: e.target.value };
                      setState((s) => ({ ...s, media }));
                    }}
                  />
                </div>
                {isImageAsset ? (
                  <ImageUpload
                    label="Upload from device"
                    value={m.url}
                    onChange={(url) => {
                      const media = [...state.media];
                      media[i] = { ...media[i], url };
                      setState((s) => ({ ...s, media }));
                    }}
                    folder="startup-media"
                    aspect={m.type === 'mockup' ? 'banner' : 'square'}
                  />
                ) : (
                  <Input
                    placeholder="Link URL (video, deck, GitHub, etc.)"
                    value={m.url}
                    onChange={(e) => {
                      const media = [...state.media];
                      media[i] = { ...media[i], url: e.target.value };
                      setState((s) => ({ ...s, media }));
                    }}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      media: s.media.filter((_, j) => j !== i),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  media: [...s.media, { type: 'screenshot', title: '', url: '' }],
                }))
              }
            >
              <Plus className="h-4 w-4" /> Add visual asset
            </Button>
          </Section>

          <Section title="5. Milestones">
            {state.milestones.map((m, i) => (
              <div key={m.key} className="grid gap-2 sm:grid-cols-4 items-center">
                <span className="text-sm font-medium sm:col-span-1">{m.label}</span>
                <select
                  className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
                  value={m.status}
                  onChange={(e) => {
                    const milestones = [...state.milestones];
                    milestones[i] = { ...milestones[i], status: e.target.value };
                    setState((s) => ({ ...s, milestones }));
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                <Input
                  type="date"
                  value={m.date}
                  onChange={(e) => {
                    const milestones = [...state.milestones];
                    milestones[i] = { ...milestones[i], date: e.target.value };
                    setState((s) => ({ ...s, milestones }));
                  }}
                />
                <Input
                  placeholder="Proof link"
                  value={m.proofUrl}
                  onChange={(e) => {
                    const milestones = [...state.milestones];
                    milestones[i] = { ...milestones[i], proofUrl: e.target.value };
                    setState((s) => ({ ...s, milestones }));
                  }}
                />
              </div>
            ))}
          </Section>

          <Section title="6. Traction">
            {state.traction.map((t, i) => (
              <div key={t.metricKey} className="flex flex-wrap items-center gap-2">
                <span className="w-32 text-sm">{t.label}</span>
                <Input
                  className="flex-1"
                  placeholder="Value"
                  value={t.value}
                  onChange={(e) => {
                    const traction = [...state.traction];
                    traction[i] = { ...traction[i], value: e.target.value };
                    setState((s) => ({ ...s, traction }));
                  }}
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={t.isPrivate}
                    onChange={(e) => {
                      const traction = [...state.traction];
                      traction[i] = { ...traction[i], isPrivate: e.target.checked };
                      setState((s) => ({ ...s, traction }));
                    }}
                  />
                  Private
                </label>
              </div>
            ))}
          </Section>

          <Section title="7. Looking for">
            {state.openings.map((o, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-4">
                <select
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                  value={o.role}
                  onChange={(e) => {
                    const openings = [...state.openings];
                    openings[i] = { ...openings[i], role: e.target.value };
                    setState((s) => ({ ...s, openings }));
                  }}
                >
                  {LOOKING_FOR_TYPES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <TextArea
                  placeholder="Description"
                  value={o.description}
                  onChange={(v) => {
                    const openings = [...state.openings];
                    openings[i] = { ...openings[i], description: v };
                    setState((s) => ({ ...s, openings }));
                  }}
                />
                <Input
                  placeholder="Skills (comma-separated)"
                  value={o.skillsRequired}
                  onChange={(e) => {
                    const openings = [...state.openings];
                    openings[i] = { ...openings[i], skillsRequired: e.target.value };
                    setState((s) => ({ ...s, openings }));
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Time commitment"
                    value={o.timeCommitment}
                    onChange={(e) => {
                      const openings = [...state.openings];
                      openings[i] = { ...openings[i], timeCommitment: e.target.value };
                      setState((s) => ({ ...s, openings }));
                    }}
                  />
                  <Input
                    placeholder="Paid / equity / volunteer"
                    value={o.compensation}
                    onChange={(e) => {
                      const openings = [...state.openings];
                      openings[i] = { ...openings[i], compensation: e.target.value };
                      setState((s) => ({ ...s, openings }));
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      openings: s.openings.filter((_, j) => j !== i),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  openings: [
                    ...s.openings,
                    {
                      role: 'developer',
                      description: '',
                      skillsRequired: '',
                      timeCommitment: '',
                      compensation: '',
                    },
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4" /> Add opening
            </Button>
          </Section>

          <Section title="8. Business model">
            <div className="flex flex-wrap gap-2">
              {REVENUE_MODELS.map((rm) => (
                <label key={rm} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={state.business.revenueModels.includes(rm)}
                    onChange={(e) => {
                      const revenueModels = e.target.checked
                        ? [...state.business.revenueModels, rm]
                        : state.business.revenueModels.filter((x) => x !== rm);
                      setState((s) => ({
                        ...s,
                        business: { ...s.business, revenueModels },
                      }));
                    }}
                  />
                  {rm}
                </label>
              ))}
            </div>
            <Input
              placeholder="Expected pricing"
              value={state.business.expectedPricing}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  business: { ...s.business, expectedPricing: e.target.value },
                }))
              }
            />
            <Input
              placeholder="Target customers"
              value={state.business.targetCustomers}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  business: { ...s.business, targetCustomers: e.target.value },
                }))
              }
            />
            <Input
              placeholder="Revenue goal"
              value={state.business.revenueGoal}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  business: { ...s.business, revenueGoal: e.target.value },
                }))
              }
            />
          </Section>

          <Section title="9. Market & competitors">
            <TextArea
              placeholder="Target market"
              value={state.market.targetMarket}
              onChange={(v) => setState((s) => ({ ...s, market: { ...s.market, targetMarket: v } }))}
            />
            <Input
              placeholder="Market size estimate"
              value={state.market.marketSize}
              onChange={(e) =>
                setState((s) => ({ ...s, market: { ...s.market, marketSize: e.target.value } }))
              }
            />
            <TextArea
              placeholder="Main competitors"
              value={state.market.competitors}
              onChange={(v) => setState((s) => ({ ...s, market: { ...s.market, competitors: v } }))}
            />
            <TextArea
              placeholder="Current alternatives"
              value={state.market.alternatives}
              onChange={(v) =>
                setState((s) => ({ ...s, market: { ...s.market, alternatives: v } }))
              }
            />
          </Section>

          <Section title="10. Visibility">
            {(['default', 'traction', 'team', 'pitch'] as const).map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm capitalize">{key} section</span>
                <select
                  className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
                  value={state.visibility[key] ?? 'PUBLIC'}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      visibility: { ...s.visibility, [key]: e.target.value },
                    }))
                  }
                >
                  {VISIBILITY_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </Section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : startupId ? 'Save startup' : 'Create & publish profile'}
          </Button>
        </div>

        <div className="hidden xl:block">
          <StartupPreview state={previewState} />
        </div>
      </div>
    </div>
  );
}
