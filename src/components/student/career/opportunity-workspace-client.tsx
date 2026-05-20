'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Loader2, MessageSquare, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { OpportunityWorkspace } from '@/lib/student/student-opportunities-hub';
import type { OpportunityStage } from '@/lib/career/opportunities-intelligence';
import { OPPORTUNITY_STAGES } from '@/lib/career/opportunities-intelligence';
import { cn } from '@/lib/utils';

export function OpportunityWorkspaceClient({
  initialWorkspace,
}: {
  initialWorkspace: OpportunityWorkspace;
}) {
  const [ws, setWs] = useState(initialWorkspace);
  const [notes, setNotes] = useState(ws.row.notes ?? '');
  const [nextAction, setNextAction] = useState(ws.row.nextAction);
  const [reflectTitle, setReflectTitle] = useState('');
  const [reflectBody, setReflectBody] = useState('');
  const [loading, setLoading] = useState(false);

  async function saveMeta() {
    setLoading(true);
    const res = await fetch(`/api/student/career/opportunities/${ws.row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, nextAction }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.workspace) setWs(data.workspace);
    }
    setLoading(false);
  }

  async function changeStage(stage: OpportunityStage) {
    setLoading(true);
    const res = await fetch(`/api/student/career/opportunities/${ws.row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.workspace) setWs(data.workspace);
    }
    setLoading(false);
  }

  async function submitReflection() {
    if (!reflectBody.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/student/career/opportunities/${ws.row.id}/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: reflectTitle || 'Interview reflection', content: reflectBody }),
    });
    if (res.ok) {
      const data = await res.json();
      setWs(data.workspace);
      setReflectBody('');
      setReflectTitle('');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/student/career/opportunities">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Pipeline
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-semibold">{ws.row.role}</h2>
          <p className="text-sm text-muted-foreground">{ws.row.companyName}</p>
        </div>
        <Badge className="ml-auto text-brand border-brand/30">{ws.row.compatibility}% compatibility</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role & company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{ws.description ?? 'No description provided.'}</p>
              <p>
                <span className="text-muted-foreground">Salary: </span>
                {ws.row.salaryRange ?? 'Not listed'}
              </p>
              <p>
                <span className="text-muted-foreground">Location: </span>
                {ws.row.location ?? '—'}
              </p>
              <p className="text-muted-foreground italic">{ws.aiInsight}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application timeline & documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {OPPORTUNITY_STAGES.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={ws.row.stage === s.id ? 'default' : 'outline'}
                    onClick={() => void changeStage(s.id)}
                    disabled={loading}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
              <ul className="space-y-2">
                {ws.documents.map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-sm">
                    <BadgeCheck className={cn('h-4 w-4', d.submitted ? 'text-emerald-600' : 'text-muted-foreground')} />
                    {d.name}
                    {d.submitted && <span className="text-xs text-muted-foreground">synced</span>}
                  </li>
                ))}
              </ul>
              <ul className="border-l-2 border-border pl-4 space-y-2">
                {ws.interactions.map((i, idx) => (
                  <li key={idx} className="text-xs">
                    <span className="text-muted-foreground">{new Date(i.at).toLocaleString()} — </span>
                    {i.label}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interview tracking</CardTitle>
            </CardHeader>
            <CardContent>
              {ws.interviewRounds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rounds logged — update stage to Interview to track.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {ws.interviewRounds.map((r) => (
                    <li key={r.round}>
                      Round {r.round}: {r.status}
                      {r.date && ` · ${new Date(r.date).toLocaleDateString()}`}
                      {r.interviewer && ` · ${r.interviewer}`}
                    </li>
                  ))}
                </ul>
              )}
              {ws.companyResponse && (
                <p className="mt-3 text-sm">
                  <span className="font-medium">Company: </span>
                  {ws.companyResponse}
                </p>
              )}
            </CardContent>
          </Card>

          {ws.rejectionInsight && (
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="text-base">Rejection intelligence</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>{ws.rejectionInsight.summary}</p>
                <p className="font-medium">Missing skills:</p>
                <ul className="list-disc pl-5">
                  {ws.rejectionInsight.missingSkills.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className="font-medium">Next time:</p>
                <ul className="list-disc pl-5">
                  {ws.rejectionInsight.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Interview reflection (AI learns from this)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Title" value={reflectTitle} onChange={(e) => setReflectTitle(e.target.value)} />
              <textarea
                className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="How did the interview go? What was difficult? What feedback did you receive?"
                value={reflectBody}
                onChange={(e) => setReflectBody(e.target.value)}
              />
              <Button onClick={() => void submitReflection()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save reflection'}
              </Button>
              {ws.reflections.map((r) => (
                <div key={r.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted-foreground text-xs mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                  <p className="mt-2">{r.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compatibility analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul>
                {ws.whyMatches.map((w) => (
                  <li key={w} className="text-emerald-700 dark:text-emerald-300">
                    + {w}
                  </li>
                ))}
              </ul>
              {ws.missingSkills.map((s) => (
                <p key={s.name} className="text-xs">
                  Gap: {s.name} ({s.gapPercent}%)
                </p>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <Link href={ws.ecosystem.compatibilityHref} className="text-brand text-xs hover:underline">
                  Open Compatibility Engine
                </Link>
                <Link href={ws.ecosystem.skillsHref} className="text-brand text-xs hover:underline">
                  Skills Tracking
                </Link>
                <Link href={ws.ecosystem.cvHref} className="text-brand text-xs hover:underline">
                  CV Builder
                </Link>
                <Link href={ws.ecosystem.mentorHref} className="text-brand text-xs hover:underline">
                  AI Career Mentor
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes & next action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Recruiter feedback, impressions…"
              />
              <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Next action" />
              <Button onClick={() => void saveMeta()} disabled={loading}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Improvement tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              {ws.improveTips.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
