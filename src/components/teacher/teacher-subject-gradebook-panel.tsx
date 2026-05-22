'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { GradebookStructure, GradeCategoryRow } from '@/lib/teacher/gradebook-structure';
import { EVALUATION_COMPONENT_PRESETS } from '@/lib/teacher/teacher-gradebook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type GradebookPayload = {
  plan: {
    mode: 'single' | 'continuous_final';
    scaleMax: number;
    blocksConfirmed: boolean;
  };
  structure: GradebookStructure;
  complete: boolean;
  operational: boolean;
  canAddComponents: boolean;
};

function WeightBar({
  summary,
  label,
  target = 100,
}: {
  summary: { total: number; remaining: number; valid: boolean };
  label: string;
  target?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span
          className={cn(
            'font-medium tabular-nums',
            summary.valid ? 'text-emerald-600' : 'text-amber-600'
          )}
        >
          {summary.total}% / {target}%
          {!summary.valid ? ` · ${summary.remaining}% left` : ' · complete'}
        </span>
      </div>
      <Progress value={Math.min((summary.total / target) * 100, 100)} className="h-2" />
    </div>
  );
}

export function TeacherSubjectGradebookPanel({ subjectId }: { subjectId: string }) {
  const [payload, setPayload] = useState<GradebookPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('10');
  const [scaleMax, setScaleMax] = useState('20');
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/teacher/subjects/${subjectId}/gradebook`);
    if (res.ok) {
      const json = await res.json();
      setPayload({
        plan: json.plan,
        structure: json.structure,
        complete: json.complete,
        operational: json.operational,
        canAddComponents: json.canAddComponents,
      });
      setScaleMax(String(json.plan.scaleMax ?? 20));
      if (json.plan.mode === 'continuous_final' && json.structure.continuous.blocks[0]) {
        setActiveParentId((prev) => prev ?? json.structure.continuous.blocks[0].id);
      }
    }
    setLoading(false);
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setMsg(null);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/gradebook`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || 'Could not save');
      return false;
    }
    setPayload({
      plan: json.plan,
      structure: json.structure,
      complete: json.complete,
      operational: json.operational,
      canAddComponents: json.canAddComponents,
    });
    setNewName('');
    return true;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payload) return null;

  const { plan, structure } = payload;
  const isSingle = plan.mode === 'single';

  async function addComponent() {
    const name = newName.trim();
    if (!name) {
      setMsg('Enter a component name');
      return;
    }
    const weight = parseFloat(newWeight);
    if (Number.isNaN(weight) || weight <= 0) {
      setMsg('Enter a valid weight %');
      return;
    }
    await patch({
      category: {
        name,
        weight,
        kind: 'component',
        parentId: isSingle ? null : activeParentId,
      },
    });
  }

  type ListedComponent = GradeCategoryRow & { blockName?: string };
  const listedComponents: ListedComponent[] = isSingle
    ? structure.single.components
    : structure.continuous.blocks.flatMap((b) =>
        b.components.map((c) => ({ ...c, blockName: b.name }))
      );

  return (
    <div className="space-y-6">
      {payload.complete && payload.operational ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Evaluation structure complete
            </p>
            <p className="text-muted-foreground mt-1">
              Workspace grading is now active. Grade each component there — final grades calculate
              automatically when every student is published.
            </p>
            <Button size="sm" className="mt-3" asChild>
              <Link href={`/teacher/workspace?view=grading&subject=${subjectId}`}>
                Open Workspace grading
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Step 1 — Evaluation structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isSingle ? 'default' : 'outline'}
              size="sm"
              onClick={() => void patch({ plan: { mode: 'single' } })}
            >
              Single evaluation
            </Button>
            <Button
              variant={!isSingle ? 'default' : 'outline'}
              size="sm"
              onClick={() => void patch({ plan: { mode: 'continuous_final' } })}
            >
              Continuous + final exam
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Grading scale (max)</p>
              <Input
                type="number"
                className="w-24"
                value={scaleMax}
                onChange={(e) => setScaleMax(e.target.value)}
                onBlur={() =>
                  void patch({ plan: { mode: plan.mode, scaleMax: parseFloat(scaleMax) } })
                }
              />
            </div>
          </div>

          {isSingle ? (
            <WeightBar summary={structure.single.summary} label="All components (must total 100%)" />
          ) : (
            <>
              <WeightBar
                summary={structure.continuous.summary}
                label="Level 1 — Continuous + Final (must total 100%)"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {structure.continuous.blocks.map((block) => (
                  <div key={block.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{block.name}</p>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          className="h-8 w-16 text-right"
                          defaultValue={block.weight}
                          disabled={plan.blocksConfirmed}
                          onBlur={(e) => {
                            const w = parseFloat(e.target.value);
                            if (!Number.isNaN(w) && w !== block.weight) {
                              void patch({
                                category: {
                                  id: block.id,
                                  name: block.name,
                                  weight: w,
                                  kind: 'block',
                                  blockKey: block.meta.blockKey,
                                },
                              });
                            }
                          }}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    {plan.blocksConfirmed ? (
                      <WeightBar
                        summary={block.summary}
                        label={`Level 2 — inside ${block.name}`}
                        target={block.weight}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              {!plan.blocksConfirmed ? (
                <Button
                  type="button"
                  onClick={() => void patch({ confirmBlocks: true })}
                  disabled={!structure.continuous.summary.valid}
                >
                  Confirm block structure (100%)
                </Button>
              ) : (
                <p className="text-sm text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Main blocks confirmed — you can add components inside each block.
                </p>
              )}
            </>
          )}

          {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
        </CardContent>
      </Card>

      <Card className={!payload.canAddComponents ? 'opacity-80' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {payload.canAddComponents ? (
              <Plus className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            Step 2 — Evaluation components
          </CardTitle>
          {!isSingle && !payload.canAddComponents ? (
            <p className="text-sm text-muted-foreground">
              Confirm the main block weights first (Continuous + Final = 100%).
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {payload.canAddComponents ? (
            <>
              {!isSingle ? (
                <div className="flex flex-wrap gap-2">
                  {structure.continuous.blocks.map((block) => (
                    <Button
                      key={block.id}
                      type="button"
                      size="sm"
                      variant={activeParentId === block.id ? 'default' : 'outline'}
                      onClick={() => setActiveParentId(block.id)}
                    >
                      {block.name} ({block.weight}%)
                    </Button>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {EVALUATION_COMPONENT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                    onClick={() => setNewName(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Component name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Weight %"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                />
                <Button type="button" onClick={() => void addComponent()}>
                  <Plus className="h-4 w-4" />
                  Add component
                </Button>
              </div>
            </>
          ) : null}

          {listedComponents.length > 0 ? (
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Added components
              </p>
              {listedComponents.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {c.blockName ? (
                      <span className="text-muted-foreground">{c.blockName} → </span>
                    ) : null}
                    {c.name} — {c.weight}%
                    {c.minGrade != null ? (
                      <span className="text-muted-foreground text-xs ml-1">
                        (min {c.minGrade})
                      </span>
                    ) : null}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => void patch({ deleteCategoryId: c.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {payload.canAddComponents
                ? 'Add components until each group reaches its target weight.'
                : 'Locked until block structure is confirmed.'}
            </p>
          )}
        </CardContent>
      </Card>

      {!payload.operational ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Workspace grading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Complete the evaluation structure above to unlock grading in Workspace.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
