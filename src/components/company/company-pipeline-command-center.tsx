'use client';

import { useCallback, useState } from 'react';
import { AI_LABEL_COPY, type PipelineStageId } from '@/lib/company/company-pipeline-intelligence';
import type { CompanyPipelineHub, PipelineCard } from '@/lib/company/company-pipeline-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2, Sparkles } from 'lucide-react';

export function CompanyPipelineCommandCenter({ initialHub }: { initialHub: CompanyPipelineHub }) {
  const [hub, setHub] = useState(initialHub);
  const [selected, setSelected] = useState<PipelineCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  const fetchHub = useCallback(async () => {
    const res = await fetch('/api/company/pipeline');
    if (res.ok) setHub(await res.json());
  }, []);

  async function moveCard(pipelineId: string, stage: PipelineStageId) {
    setLoading(true);
    const res = await fetch('/api/company/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineId, stage }),
    });
    if (res.ok) {
      const next = await res.json();
      setHub(next);
      const flat = Object.values(next.columns).flat() as PipelineCard[];
      setSelected(flat.find((c) => c.id === pipelineId) ?? null);
    }
    setLoading(false);
  }

  async function saveNotes() {
    if (!selected) return;
    setLoading(true);
    const res = await fetch('/api/company/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineId: selected.id, internalNotes: note }),
    });
    if (res.ok) setHub(await res.json());
    setLoading(false);
  }

  async function sendMsg() {
    if (!selected || !message.trim()) return;
    setLoading(true);
    await fetch('/api/company/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'message', pipelineId: selected.id, message }),
    });
    setMessage('');
    await fetchHub();
    setLoading(false);
  }

  async function scheduleInterview() {
    if (!selected) return;
    const start = new Date();
    start.setDate(start.getDate() + 3);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setLoading(true);
    await fetch('/api/company/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'interview',
        pipelineId: selected.id,
        interview: { startAt: start.toISOString(), endAt: end.toISOString() },
      }),
    });
    await fetchHub();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {hub.aiHighlights.length > 0 && (
        <section className="flex flex-wrap gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          {hub.aiHighlights.map((h) => (
            <Badge key={h.pipelineId + h.label} variant="secondary" className="gap-1">
              {AI_LABEL_COPY[h.label as keyof typeof AI_LABEL_COPY] ?? h.label}: {h.candidateName}
            </Badge>
          ))}
        </section>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {hub.stages.map((stage) => (
          <div
            key={stage.id}
            className="min-w-[280px] shrink-0 rounded-xl border bg-muted/20"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) void moveCard(dragId, stage.id);
              setDragId(null);
            }}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wide">{stage.label}</span>
              <span className="text-xs text-muted-foreground">{hub.columns[stage.id]?.length ?? 0}</span>
            </div>
            <div className="space-y-2 p-2 min-h-[200px]">
              {(hub.columns[stage.id] ?? []).map((card) => (
                <button
                  key={card.id}
                  type="button"
                  draggable
                  onDragStart={() => setDragId(card.id)}
                  onClick={() => {
                    setSelected(card);
                    setNote(card.internalNotes);
                  }}
                  className={cn(
                    'w-full rounded-lg border bg-card p-3 text-left shadow-sm transition hover:shadow-md',
                    selected?.id === card.id && 'ring-2 ring-slate-900'
                  )}
                >
                  <div className="flex gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm">
                      {card.candidate.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{card.candidate.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {card.candidate.program} · {card.candidate.universityName}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {card.candidate.compatibilityScore != null && (
                      <Badge variant="outline" className="text-[10px]">
                        {card.candidate.compatibilityScore}% fit
                      </Badge>
                    )}
                    {card.candidate.aiLabels.slice(0, 1).map((l) => (
                      <Badge key={l} className="text-[10px] bg-violet-500/10 text-violet-700">
                        {AI_LABEL_COPY[l]}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1 space-y-3">
              <h3 className="text-xl font-semibold">{selected.candidate.name}</h3>
              <p className="text-sm text-muted-foreground">{selected.candidate.headline}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2">Employability {selected.candidate.employabilityScore}%</div>
                <div className="rounded-lg bg-muted/40 p-2">Profile {selected.candidate.profileStrength}%</div>
                <div className="rounded-lg bg-muted/40 p-2">
                  Compatibility {selected.candidate.compatibilityScore ?? '—'}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Skills: {selected.candidate.topSkills.join(', ') || '—'} · {selected.candidate.startupInvolvement ?? 'No startup'}
              </p>
              <p className="text-xs">{selected.candidate.recentActivity}</p>
            </div>
            <div className="w-full lg:w-80 space-y-3">
              <label className="text-xs font-medium">Internal notes</label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border px-3 py-2 text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={() => void saveNotes()} disabled={loading}>
                Save notes
              </Button>
              <Input
                placeholder="Message candidate…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button size="sm" onClick={() => void sendMsg()} disabled={loading}>
                Send message + notify
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void scheduleInterview()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule interview (syncs calendar)'}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
