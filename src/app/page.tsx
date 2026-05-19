import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,99,235,0.08),_transparent_50%)]" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
            U
          </div>
          <span className="text-lg font-semibold tracking-tight">UniBridge</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Create account</Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-16">
        <div className="max-w-3xl animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            The Operating System for Academic and Professional Growth
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl">
            Build your future.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            UniBridge connects universities, students, teachers, recruiters,
            companies, and founders into one connected progression ecosystem.
          </p>
          <p className="mt-4 text-base text-muted-foreground">
            Organized around progression — not documents.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Enter the ecosystem
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Students',
              desc: 'Track academics, career compatibility, startups, and professional identity.',
            },
            {
              title: 'Universities & Teachers',
              desc: 'Elegant LMS, analytics, and intelligent insights without the bureaucracy.',
            },
            {
              title: 'Companies & Ecosystem',
              desc: 'Elite recruitment intelligence, talent discovery, and innovation pipelines.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-card"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
