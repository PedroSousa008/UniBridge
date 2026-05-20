'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Archive, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MessagesHub, SubjectMessageRow } from '@/lib/student/student-messages';

function SubjectMessageCard({ row }: { row: SubjectMessageRow }) {
  const hasUnread = row.unreadCount > 0;

  return (
    <Link href={row.href}>
      <Card
        className={cn(
          'relative transition-shadow hover:shadow-md',
          hasUnread && 'border-brand/50 bg-brand/[0.03] ring-1 ring-brand/20'
        )}
      >
        {hasUnread && (
          <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
        )}
        <CardContent className="flex items-start gap-3 py-4">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              hasUnread ? 'bg-brand/15 text-brand' : 'bg-muted text-muted-foreground'
            )}
          >
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{row.subjectName}</p>
              {hasUnread && (
                <Badge variant="brand" className="text-[10px]">
                  {row.unreadCount} new
                </Badge>
              )}
            </div>
            {row.subjectCode && (
              <p className="text-xs text-muted-foreground">{row.subjectCode}</p>
            )}
            {row.professor && (
              <p className="mt-0.5 text-xs text-muted-foreground">{row.professor}</p>
            )}
            {row.lastMessagePreview && (
              <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                {row.lastMessagePreview}
              </p>
            )}
            {row.lastMessageAt && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {format(parseISO(row.lastMessageAt), 'MMM d, HH:mm')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function MessagesHubClient({ initialHub }: { initialHub: MessagesHub }) {
  const [hub, setHub] = useState(initialHub);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [syncPending, setSyncPending] = useState(!initialHub.dbReady);

  useEffect(() => {
    if (!syncPending) return;
    fetch('/api/student/messages')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.activeSubjects) {
          setHub(data);
          setSyncPending(false);
        }
      });
  }, [syncPending]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subject messages"
        subtitle="Class channels by subject — current semester first, past subjects archived automatically."
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">
          {hub.currentPeriod.semester} {hub.currentPeriod.year}
        </Badge>
        {hub.totalUnread > 0 && (
          <Badge variant="brand">{hub.totalUnread} unread across subjects</Badge>
        )}
      </div>

      {hub.activeSubjects.length === 0 && hub.archivedSubjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrolled subjects.</p>
      ) : (
        <>
          {hub.activeSubjects.length > 0 ? (
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Current subjects</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {hub.activeSubjects.map((row) => (
                  <SubjectMessageCard key={row.subjectId} row={row} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active subject messages this semester.</p>
          )}

          {hub.archivedSubjects.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setArchivedOpen((v) => !v)}
                className="mb-3 flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {archivedOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Archive className="h-4 w-4" />
                Archived subjects ({hub.archivedSubjects.length})
              </button>
              {archivedOpen && (
                <div className="grid gap-3 sm:grid-cols-2 opacity-90">
                  {hub.archivedSubjects.map((row) => (
                    <SubjectMessageCard key={row.subjectId} row={row} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
