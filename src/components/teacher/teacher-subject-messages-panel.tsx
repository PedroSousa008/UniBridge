'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Send, Users } from 'lucide-react';
import type { TeacherSubjectMessages } from '@/lib/teacher/teacher-subject-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Message = TeacherSubjectMessages[number];

export function TeacherSubjectMessagesPanel({
  subjectId,
  initialMessages,
  composeStudentId,
  composeStudentName,
  channel = 'class',
}: {
  subjectId: string;
  initialMessages: TeacherSubjectMessages;
  composeStudentId?: string;
  composeStudentName?: string;
  channel?: 'class' | 'direct';
}) {
  const isDirect = channel === 'direct' && !!composeStudentId;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    const qs = isDirect
      ? `?channel=direct&studentId=${encodeURIComponent(composeStudentId!)}`
      : '?channel=class';
    const res = await fetch(`/api/teacher/subjects/${subjectId}/messages${qs}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }, [subjectId, isDirect, composeStudentId]);

  useEffect(() => {
    if (isDirect) void loadMessages();
  }, [isDirect, loadMessages]);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: body.trim(),
        channel: isDirect ? 'direct' : 'class',
        recipientId: isDirect ? composeStudentId : undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((m) => [...m, data.message]);
      setBody('');
    }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      {isDirect ? (
        <Link
          href={`/teacher/students/${subjectId}/${composeStudentId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to student profile
        </Link>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {isDirect
              ? `Direct message — ${composeStudentName ?? 'Student'}`
              : 'Class communication'}
          </CardTitle>
          {isDirect ? (
            <p className="text-xs text-muted-foreground">
              This message is delivered to the student&apos;s Direct Messages for this subject.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-h-80 space-y-3 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium text-xs text-muted-foreground">{m.author?.name}</p>
                  <p className="mt-1">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={isDirect ? 'Write a direct message…' : 'Message the class…'}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void send()}
            />
            <Button onClick={() => void send()} disabled={sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
