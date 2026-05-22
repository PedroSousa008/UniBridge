'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { GradebookStructure } from '@/lib/teacher/gradebook-structure';
import { EVALUATION_COMPONENT_PRESETS } from '@/lib/teacher/teacher-gradebook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type GradebookPayload = {
  plan: { mode: 'single' | 'continuous_final'; scaleMax: number };
  structure: GradebookStructure;
};

function WeightBar({
  summary,
  label,
}: {
  summary: { total: number; remaining: number; valid: boolean };
  label: string;
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
          {summary.total}% / 100%
          {!summary.valid ? ` · ${summary.remaining}% left` : ' · complete'}
        </span>
      </div>
      <Progress value={Math.min(summary.total, 100)} className="h-2" />
    </div>
  );
}

export function TeacherSubjectGradebookPanel({ subjectId }: { subjectId: string }) {
  const [payload, setPayload] = useState<GradebookPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('10');
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/teacher/subjects/${subjectId}/gradebook`);
    if (res.ok) {
      const json = await res.json();
      setPayload({ plan: json.plan, structure: json.structure });
      if (json.plan.mode === 'continuous_final' && json.structure.continuous.blocks[0]) {
        setActiveParentId((prev) => prev ?? json.structure.continuous.blocks[0].id);
      } else {
        setActiveParentId(null);
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
    setPayload({ plan: json.plan, structure: json.structure });
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

  async function updateBlockWeight(blockId: string, weight: number) {
    const block = structure.continuous.blocks.find((b) => b.id === blockId);
    if (!block) return;
    await patch({
      category: { id: blockId, name: block.name, weight, kind: 'block', blockKey: block.meta.blockKey },
    });
  }

  const listedComponents = isSingle
    ? structure.single.components
    : structure.continuous.blocks.flatMap((b) =>
        b.components.map((c) => ({ ...c, blockName: b.name }))
      );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evaluation structure
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

          {isSingle ? (
            <WeightBar summary={structure.single.summary} label="Total evaluation weight" />
          ) : (
            <>
              <WeightBar
                summary={structure.continuous.summary}
                label="Continuous + Final Exam (main blocks)"
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
                          onBlur={(e) => {
                            const w = parseFloat(e.target.value);
                            if (!Number.isNaN(w) && w !== block.weight) {
                              void updateBlockWeight(block.id, w);
                            }
                          }}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <WeightBar
                      summary={block.summary}
                      label={`Components inside ${block.name}`}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add evaluation component</CardTitle>
          {!isSingle ? (
            <p className="text-sm text-muted-foreground">
              Components are added inside a block. Select which block below.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
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
                    {'blockName' in c && c.blockName ? (
                      <span className="text-muted-foreground">{c.blockName} → </span>
                    ) : null}
                    {c.name} — {c.weight}%
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
              No components yet. Add your first one above — weights can be built up until they
              reach 100%.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Grade & publish
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Published grades sync live to each student. Students only see their own results.
          </p>
          <Button asChild>
            <Link href={`/teacher/workspace?view=grading&subject=${subjectId}`}>
              Open grading workspace
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
