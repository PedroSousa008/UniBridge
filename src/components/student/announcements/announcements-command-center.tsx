'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Filter,
  Megaphone,
  Pin,
  Radio,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type AnnouncementCard,
  type AnnouncementsHub,
} from '@/lib/student/student-announcements';

const PRIORITY_STYLES = {
  INFORMATIONAL: 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40',
  IMPORTANT: 'border-blue-200/80 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30',
  URGENT: 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30',
  CRITICAL: 'border-red-200/80 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30',
};

const PRIORITY_DOT = {
  INFORMATIONAL: 'bg-slate-400',
  IMPORTANT: 'bg-blue-500',
  URGENT: 'bg-amber-500',
  CRITICAL: 'bg-red-500',
};

const POLL_MS = 15_000;

export function AnnouncementsCommandCenter({ initialHub }: { initialHub: AnnouncementsHub }) {
  const searchParams = useSearchParams();
  const [hub, setHub] = useState(initialHub);
  const [selected, setSelected] = useState<AnnouncementCard | null>(null);
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState(searchParams.get('subject') ?? '');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [professor, setProfessor] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [live, setLive] = useState(true);
  const [lastSync, setLastSync] = useState(initialHub.serverTime);

  const fetchHub = useCallback(
    async (since?: string) => {
      const params = new URLSearchParams();
      if (subjectId) params.set('subjectId', subjectId);
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);
      if (professor) params.set('professor', professor);
      if (unreadOnly) params.set('unreadOnly', 'true');
      if (since) params.set('since', since);

      const res = await fetch(`/api/student/announcements?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as AnnouncementsHub;
      if (since) {
        setHub((prev) => {
          const ids = new Set(prev.announcements.map((a) => `${a.kind}:${a.id}`));
          const merged = [...data.announcements.filter((a) => !ids.has(`${a.kind}:${a.id}`)), ...prev.announcements];
          return { ...data, announcements: merged };
        });
      } else {
        setHub(data);
      }
      setLastSync(data.serverTime);
    },
    [subjectId, category, priority, professor, unreadOnly]
  );

  useEffect(() => {
    fetchHub();
  }, [fetchHub]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => fetchHub(lastSync), POLL_MS);
    return () => clearInterval(t);
  }, [live, lastSync, fetchHub]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hub.announcements;
    return hub.announcements.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.preview.toLowerCase().includes(q) ||
        a.subjectName?.toLowerCase().includes(q)
    );
  }, [hub.announcements, search]);

  const markRead = async (card: AnnouncementCard) => {
    if (card.read) return;
    await fetch('/api/student/announcements/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: card.kind, id: card.id }),
    });
    setHub((h) => ({
      ...h,
      unreadCount: Math.max(0, h.unreadCount - 1),
      announcements: h.announcements.map((a) =>
        a.id === card.id && a.kind === card.kind ? { ...a, read: true } : a
      ),
    }));
  };

  const markAllRead = async () => {
    await fetch('/api/student/announcements/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setHub((h) => ({
      ...h,
      unreadCount: 0,
      announcements: h.announcements.map((a) => ({ ...a, read: true })),
    }));
  };

  const openCard = (card: AnnouncementCard) => {
    setSelected(card);
    void markRead(card);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Linked academic updates — synced from exams, assignments, documents, schedule, and attendance."
        action={
          <div className="flex flex-wrap gap-2">
            {hub.unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            )}
            <Button
              variant={live ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLive((v) => !v)}
            >
              <Radio className={cn('mr-2 h-4 w-4', live && 'animate-pulse')} />
              {live ? 'Live' : 'Paused'}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="gap-1">
          <Bell className="h-3 w-3" />
          {hub.unreadCount} unread
        </Badge>
        {!hub.dbReady && (
          <span className="text-xs text-amber-700 dark:text-amber-300">Syncing schema…</span>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Input
              placeholder="Search announcements…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">All subjects</option>
            {hub.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All types</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={professor}
            onChange={(e) => setProfessor(e.target.value)}
          >
            <option value="">All professors</option>
            {hub.professors.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <Megaphone className="mb-3 h-10 w-10 opacity-40" />
            <p>No announcements match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <button
              key={`${a.kind}-${a.id}`}
              type="button"
              onClick={() => openCard(a)}
              className={cn(
                'w-full rounded-xl border p-4 text-left transition-shadow hover:shadow-md',
                PRIORITY_STYLES[a.priorityLevel],
                !a.read && 'ring-2 ring-brand/30'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', PRIORITY_DOT[a.priorityLevel])}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && <Pin className="h-3.5 w-3.5 text-brand" />}
                    {!a.read && (
                      <Badge variant="brand" className="text-[10px]">
                        New
                      </Badge>
                    )}
                    <Badge variant="secondary">{CATEGORY_LABELS[a.category]}</Badge>
                    <Badge variant="outline">{PRIORITY_LABELS[a.priorityLevel]}</Badge>
                  </div>
                  <p className="mt-1 font-semibold">{a.title}</p>
                  {a.subjectName && (
                    <p className="text-xs text-muted-foreground">
                      {a.subjectName}
                      {a.professor ? ` · ${a.professor}` : ''}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.preview}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.sourceName} · {format(parseISO(a.publishedAt), 'MMM d, HH:mm')}
                    {a.isAutoGenerated ? ' · Auto-synced' : ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge>{CATEGORY_LABELS[selected.category]}</Badge>
                  <Badge variant="outline">{PRIORITY_LABELS[selected.priorityLevel]}</Badge>
                </div>
                <p className="whitespace-pre-wrap">{selected.body}</p>
                {selected.attachments.length > 0 && (
                  <ul className="space-y-1">
                    {selected.attachments.map((att, i) => (
                      <li key={i}>
                        <a
                          href={att.fileUrl || att.url || '#'}
                          className="text-primary underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {att.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selected.linkHref && (
                    <Button asChild>
                      <Link href={selected.linkHref}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {selected.linkLabel ?? 'Open'}
                      </Link>
                    </Button>
                  )}
                  {selected.subjectId && (
                    <Button variant="outline" asChild>
                      <Link href={`/student/academics/subjects/${selected.subjectId}/announcements`}>
                        Subject feed
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

