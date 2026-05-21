'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { StudentCompanyEventPage } from '@/lib/student/student-company-event-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
} from 'lucide-react';

function SpeakerCard({
  speaker,
}: {
  speaker: StudentCompanyEventPage['card']['speakers'][0];
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-slate-700 to-emerald-700 flex items-center justify-center text-sm font-bold text-white">
          {speaker.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{speaker.name}</p>
          <p className="text-sm text-muted-foreground">{speaker.role}</p>
          {speaker.company && <p className="text-xs text-muted-foreground mt-0.5">{speaker.company}</p>}
          {speaker.bio && <p className="text-sm mt-2 leading-relaxed">{speaker.bio}</p>}
        </div>
      </div>
    </div>
  );
}

export function StudentCompanyEventClient({
  initialPage,
}: {
  initialPage: StudentCompanyEventPage;
}) {
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const { card } = page;

  async function handleRsvp() {
    setLoading(true);
    const res = await fetch(`/api/student/company-events/${card.id}/rsvp`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.page) setPage(data.page);
    }
    setLoading(false);
  }

  const hasRsvp = page.rsvpStatus === 'rsvp' || page.rsvpStatus === 'attended';
  const onWaitlist = page.rsvpStatus === 'waitlist';

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-3xl px-6 py-8 text-white shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${card.color} 0%, #0f172a 55%, #134e4a 100%)`,
        }}
      >
        <div className="relative">
          <Badge className="bg-white/20 text-white border-0 mb-3">{card.typeLabel}</Badge>
          {page.isInvited && (
            <Badge className="ml-2 bg-amber-400/90 text-amber-950 border-0 mb-3">
              Personal invite
            </Badge>
          )}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{card.title}</h1>
          <p className="mt-2 text-white/80 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {card.companyName}
          </p>
          <p className="text-sm text-white/65 mt-1">{card.universityName}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {card.momentumSignals.slice(0, 3).map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {card.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.coverUrl} alt="" className="w-full h-48 object-cover rounded-2xl -mt-4 border" />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4 flex gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">When</p>
              <p className="font-medium text-sm mt-1">
                {new Date(card.startsAt).toLocaleString()} – {new Date(card.endsAt).toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs uppercase text-muted-foreground">Format</p>
              <p className="font-medium text-sm mt-1 capitalize">
                {card.eventFormat}
                {card.location && !card.isOnline ? ` · ${card.location}` : card.isOnline ? ' · Online' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            How this event works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {page.howItWorks.map((step) => (
            <div key={step.step} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {step.step}
              </span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {card.description && (
        <section>
          <h2 className="text-lg font-semibold mb-2">About</h2>
          <p className="text-muted-foreground leading-relaxed">{card.description}</p>
        </section>
      )}

      {card.goals.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">What you will gain</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {card.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      )}

      {card.agenda.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Agenda</h2>
          <div className="rounded-xl border divide-y">
            {card.agenda.map((item, i) => (
              <div key={i} className="flex gap-4 px-4 py-3">
                <span className="text-sm font-mono text-muted-foreground w-16 shrink-0">{item.time}</span>
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {card.speakers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">People you will meet</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {card.speakers.map((sp) => (
              <SpeakerCard key={sp.id} speaker={sp} />
            ))}
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips before you go</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {page.experienceTips.map((tip) => (
              <li key={tip} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-emerald-600">·</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {card.rsvpCount} students registered
            {page.spotsLeft != null && ` · ${page.spotsLeft} spots left`}
          </div>
          {card.registrationDeadline && (
            <p className="text-xs text-muted-foreground">
              RSVP by {new Date(card.registrationDeadline).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {hasRsvp ? (
            <Button disabled className="gap-2 bg-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              You are registered
            </Button>
          ) : onWaitlist ? (
            <Button disabled variant="secondary">
              On waitlist
            </Button>
          ) : (
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
              onClick={() => void handleRsvp()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {page.spotsLeft === 0 ? 'Join waitlist' : 'RSVP — save my spot'}
            </Button>
          )}
          {page.preEventNetworkingOpen && (
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/student/academics/messages">
                <MessageCircle className="h-4 w-4" />
                Pre-event networking
              </Link>
            </Button>
          )}
        </div>

        <p className={cn('text-xs text-muted-foreground')}>
          Attendance mode: {page.attendanceMode.replace('_', ' ')}. Participating updates your ecosystem
          profile indicators.
        </p>
      </section>
    </div>
  );
}
