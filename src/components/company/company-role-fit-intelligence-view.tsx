'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SlidePanel } from '@/components/ui/slide-panel';
import { cn } from '@/lib/utils';
import {
  PREFERRED_QUALITY_TEMPLATES,
  REQUIREMENT_TEMPLATES,
  REQUIREMENT_TYPE_META,
  VALIDATION_SOURCE_META,
  WEIGHT_OPTIONS,
  type RequirementType,
  type RequirementWeight,
  type ValidationSource,
} from '@/lib/company/company-requirement-catalog';
import {
  structuredFromTemplate,
  type RoleFitIntelligenceView,
  type StructuredRequirement,
} from '@/lib/company/company-role-requirements';

function randomId() {
  return crypto.randomUUID();
}

function RequirementBlock({
  req,
  strict,
  onEdit,
  onArchive,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  req: StructuredRequirement;
  strict?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  if (req.status === 'archived') return null;
  const typeMeta = REQUIREMENT_TYPE_META[req.type];
  const valMeta = VALIDATION_SOURCE_META[req.validationSource];
  const weightColor =
    req.weight === 'critical'
      ? 'border-rose-500/40 bg-rose-500/5'
      : req.weight === 'bonus'
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : 'border-brand/25 bg-brand/5';

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition hover:shadow-sm',
        weightColor,
        strict && 'ring-1 ring-rose-500/20'
      )}
    >
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 pt-1">
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onMoveUp} disabled={!canMoveUp}>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onMoveDown} disabled={!canMoveDown}>
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{req.name}</p>
            <Badge variant="outline" className="text-[10px]">
              {typeMeta.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                req.weight === 'critical' && 'text-rose-700 border-rose-500/40'
              )}
            >
              {req.weight}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{req.category}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-md bg-muted px-2 py-0.5">{valMeta.label}</span>
            <span className="rounded-md bg-muted px-2 py-0.5">
              {req.autoTracking ? 'Auto-tracking on' : 'Manual tracking'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onArchive}>
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreferredChip({
  req,
  onRemove,
}: {
  req: StructuredRequirement;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="rounded-full border border-brand/30 bg-gradient-to-r from-brand/10 to-indigo-500/10 px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:shadow-sm"
    >
      {req.name}
      <span className="ml-2 text-[10px] text-muted-foreground">+{req.weightScore} boost</span>
    </button>
  );
}

export function CompanyRoleFitIntelligenceView({
  roleId,
  onBack,
}: {
  roleId: string;
  onBack: () => void;
}) {
  const [view, setView] = useState<RoleFitIntelligenceView | null>(null);
  const [allReqs, setAllReqs] = useState<StructuredRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addPreferred, setAddPreferred] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    type: 'skill' as RequirementType,
    category: 'General',
    validationSource: 'ai_inferred' as ValidationSource,
    weight: 'important' as RequirementWeight,
    weightScore: 7,
    templateId: '',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/company/presence/roles/${roleId}/requirements`);
    if (res.ok) {
      const data = (await res.json()) as RoleFitIntelligenceView;
      setView(data);
      setAllReqs([...data.requirements, ...data.preferredQualities]);
    }
    setLoading(false);
  }, [roleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeNonNegotiable = useMemo(
    () => allReqs.filter((r) => !r.isPreferred && r.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder),
    [allReqs]
  );
  const activePreferred = useMemo(
    () => allReqs.filter((r) => r.isPreferred && r.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder),
    [allReqs]
  );

  const persist = useCallback(
    async (next: StructuredRequirement[], previewOnly = false) => {
      setAllReqs(next);
      if (previewOnly) {
        const res = await fetch(`/api/company/presence/roles/${roleId}/requirements`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'preview', requirements: next }),
        });
        if (res.ok) {
          const { preview } = await res.json();
          setView((v) => (v ? { ...v, preview } : v));
        }
        return;
      }
      setSaving(true);
      const res = await fetch(`/api/company/presence/roles/${roleId}/requirements`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: next }),
      });
      if (res.ok) {
        const data = await res.json();
        setView(data);
        setAllReqs([...data.requirements, ...data.preferredQualities]);
      }
      setSaving(false);
    },
    [roleId]
  );

  const reorder = (id: string, dir: -1 | 1, isPreferred: boolean) => {
    const list = allReqs
      .filter((r) => r.isPreferred === isPreferred && r.status === 'active')
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = list.findIndex((r) => r.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    const next = [...allReqs];
    const a = next.find((r) => r.id === list[idx].id)!;
    const b = next.find((r) => r.id === list[swap].id)!;
    const tmp = a.sortOrder;
    a.sortOrder = b.sortOrder;
    b.sortOrder = tmp;
    void persist(next, true);
    void persist(next);
  };

  const openAdd = (preferred: boolean) => {
    setAddPreferred(preferred);
    setEditingId(null);
    setDraft({
      name: '',
      type: preferred ? 'behavioral' : 'skill',
      category: 'General',
      validationSource: 'ai_inferred',
      weight: preferred ? 'bonus' : 'important',
      weightScore: preferred ? 4 : 7,
      templateId: '',
    });
    setPanelOpen(true);
  };

  const openEdit = (req: StructuredRequirement) => {
    setEditingId(req.id);
    setAddPreferred(req.isPreferred);
    setDraft({
      name: req.name,
      type: req.type,
      category: req.category,
      validationSource: req.validationSource,
      weight: req.weight,
      weightScore: req.weightScore,
      templateId: req.tagId ?? '',
    });
    setPanelOpen(true);
  };

  const saveDraft = () => {
    const maxOrder = Math.max(0, ...allReqs.map((r) => r.sortOrder)) + 1;
    const weightScore =
      WEIGHT_OPTIONS.find((w) => w.id === draft.weight)?.score ?? draft.weightScore;
    const entry: StructuredRequirement = {
      id: editingId ?? randomId(),
      name: draft.name.trim() || 'New requirement',
      type: draft.type,
      category: draft.category,
      validationSource: draft.validationSource,
      weight: draft.weight,
      weightScore,
      tagId: draft.templateId || undefined,
      isPreferred: addPreferred,
      status: 'active',
      sortOrder: editingId
        ? allReqs.find((r) => r.id === editingId)?.sortOrder ?? maxOrder
        : maxOrder,
      autoTracking: true,
    };
    const next = editingId
      ? allReqs.map((r) => (r.id === editingId ? entry : r))
      : [...allReqs, entry];
    setPanelOpen(false);
    void persist(next);
  };

  if (loading && !view) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading role fit intelligence…</p>;
  }

  if (!view) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Could not load this role.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  const preview = view.preview;

  return (
    <div className="space-y-8 animate-in fade-in duration-400">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Role Requirements Hub
      </Button>

      <section className="rounded-3xl border bg-gradient-to-br from-card via-card to-brand/5 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="mb-2">{view.hero.openLabel}</Badge>
            <h2 className="text-3xl font-semibold tracking-tight">{view.title}</h2>
            {view.departmentName && (
              <p className="text-sm text-muted-foreground mt-1">{view.departmentName}</p>
            )}
          </div>
          {saving && <Loader2 className="h-5 w-5 animate-spin text-brand" />}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Compatibility avg', `${view.hero.compatibilityAverage}%`],
            ['Compatible students', String(view.hero.totalCompatibleStudents)],
            ['Top degree', view.hero.strongestMatchingDegree],
            ['Applications', String(view.hero.applicationCount)],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl border bg-card/80 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold mt-0.5 truncate">{val}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {view.hero.topSkills.map((sk) => (
            <Badge key={sk} variant="secondary">
              {sk}
            </Badge>
          ))}
          <Badge variant="outline">Startup {view.hero.startupAlignment}%</Badge>
          <Badge variant="outline">Leadership {view.hero.leadershipAlignment}%</Badge>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-rose-600" />
                  Non-negotiable requirements
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Absolute requirements students must meet — connected to verified UniBridge data.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openAdd(false)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-3">
              {activeNonNegotiable.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
                  Add your first non-negotiable to activate strict matching.
                </p>
              ) : (
                activeNonNegotiable.map((req, i) => (
                  <RequirementBlock
                    key={req.id}
                    req={req}
                    strict
                    onEdit={() => openEdit(req)}
                    onArchive={() => {
                      const next = allReqs.map((r) =>
                        r.id === req.id ? { ...r, status: 'archived' as const } : r
                      );
                      void persist(next);
                    }}
                    onDuplicate={() => {
                      const copy = { ...req, id: randomId(), name: `${req.name} (copy)`, sortOrder: req.sortOrder + 0.5 };
                      void persist([...allReqs, copy]);
                    }}
                    onMoveUp={() => reorder(req.id, -1, false)}
                    onMoveDown={() => reorder(req.id, 1, false)}
                    canMoveUp={i > 0}
                    canMoveDown={i < activeNonNegotiable.length - 1}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Preferred qualities</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Aspirational signals that boost compatibility — not mandatory.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openAdd(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add quality
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activePreferred.length === 0 ? (
                <p className="text-sm text-muted-foreground w-full rounded-xl border border-dashed p-6 text-center">
                  Add preferred qualities to reward startup founders, leaders, and high performers.
                </p>
              ) : (
                activePreferred.map((req) => (
                  <PreferredChip
                    key={req.id}
                    req={req}
                    onRemove={() => openEdit(req)}
                  />
                ))
              )}
            </div>
          </section>

          {view.topStudents.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3">Top matching students</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {view.topStudents.map((s) => (
                  <Card key={s.userId}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xl font-bold text-brand tabular-nums">{s.compatibility}%</p>
                      </div>
                      <ul className="mt-2 space-y-0.5">
                        {s.whyFits.map((line) => (
                          <li key={line} className="text-[11px] text-muted-foreground">
                            · {line}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-brand/25 bg-gradient-to-b from-brand/5 to-transparent sticky top-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand" />
                Live compatibility preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  ['Strong', preview.strongMatches],
                  ['Potential', preview.potentialMatches],
                  ['Leadership', preview.highLeadershipMatches],
                  ['Startup', preview.startupAlignedMatches],
                  ['Missing 1 req', preview.missingOneRequirement],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-xl bg-muted/50 py-2">
                    <p className="text-lg font-bold tabular-nums text-brand">{val}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {preview.simulations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-brand" />
                    Simulation insights
                  </p>
                  {preview.simulations.map((sim, i) => (
                    <p key={i} className="text-xs rounded-lg bg-muted/60 px-3 py-2 text-muted-foreground">
                      {sim.text}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit requirement' : addPreferred ? 'Add preferred quality' : 'Add requirement'}>
        <div className="space-y-4 p-1">
          {!addPreferred && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick add from ecosystem</p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {REQUIREMENT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px]',
                      draft.templateId === t.id && 'bg-brand text-white border-brand'
                    )}
                    onClick={() => {
                      const built = structuredFromTemplate(t, false, 0);
                      setDraft({
                        name: built.name,
                        type: built.type,
                        category: built.category,
                        validationSource: built.validationSource,
                        weight: built.weight,
                        weightScore: built.weightScore,
                        templateId: t.id,
                      });
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {addPreferred && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Preferred qualities</p>
              <div className="flex flex-wrap gap-1.5">
                {PREFERRED_QUALITY_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px]',
                      draft.templateId === t.id && 'bg-brand text-white border-brand'
                    )}
                    onClick={() => {
                      const built = structuredFromTemplate(t, true, 0);
                      setDraft({
                        name: built.name,
                        type: built.type,
                        category: built.category,
                        validationSource: built.validationSource,
                        weight: 'bonus',
                        weightScore: 4,
                        templateId: t.id,
                      });
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Input
            placeholder="Requirement name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <select
            className="h-11 w-full rounded-xl border px-3 text-sm"
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as RequirementType })}
          >
            {Object.entries(REQUIREMENT_TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label} — {v.description}
              </option>
            ))}
          </select>
          <Input
            placeholder="Category"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          />
          <select
            className="h-11 w-full rounded-xl border px-3 text-sm"
            value={draft.validationSource}
            onChange={(e) =>
              setDraft({ ...draft, validationSource: e.target.value as ValidationSource })
            }
          >
            {Object.entries(VALIDATION_SOURCE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Weight / intensity</p>
            <div className="flex gap-2">
              {WEIGHT_OPTIONS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={cn(
                    'flex-1 rounded-xl border py-2 text-xs font-medium',
                    draft.weight === w.id && 'bg-brand text-white border-brand'
                  )}
                  onClick={() => setDraft({ ...draft, weight: w.id, weightScore: w.score })}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={draft.weightScore}
              className="w-full mt-3"
              onChange={(e) => setDraft({ ...draft, weightScore: Number(e.target.value) })}
            />
            <p className="text-[10px] text-center text-muted-foreground mt-1">Score: {draft.weightScore}/10</p>
          </div>
          <Button className="w-full" variant="brand" onClick={saveDraft}>
            {editingId ? 'Save changes' : 'Add to role'}
          </Button>
        </div>
      </SlidePanel>
    </div>
  );
}
