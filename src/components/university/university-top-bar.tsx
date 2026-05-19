'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { getInitials } from '@/lib/utils';

const QUICK_ACTIONS = [
  { label: 'Add Course', href: '/university/academics?tab=courses&action=add' },
  { label: 'Add Subject', href: '/university/academics?tab=subjects&action=add' },
  { label: 'Invite Teacher', href: '/university/academics?tab=teachers&action=invite' },
  { label: 'Invite Student', href: '/university/academics?tab=students&action=invite' },
  { label: 'Create Announcement', href: '/university/academics?tab=announcements&action=add' },
  { label: 'Add Company', href: '/university/career?tab=partnerships&action=add' },
  { label: 'Create Event', href: '/university/academics?tab=schedules&action=add' },
  {
    label: 'Create Incubator Program',
    href: '/university/innovation?tab=incubator&action=add',
  },
];

export function UniversityTopBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch('/api/notifications?unread=true')
      .then((r) => r.json())
      .then((d) => setUnread(d.count ?? 0))
      .catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/university/search?q=${encodeURIComponent(query.trim())}`);
  }

  async function askAi(question: string) {
    setAiLoading(true);
    setAiAnswer('');
    const res = await fetch('/api/university/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setAiAnswer(data.answer || 'Unable to generate insight.');
    setAiLoading(false);
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 px-6 backdrop-blur-xl">
        <form onSubmit={handleSearch} className="hidden flex-1 md:block md:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, teachers, companies, startups…"
              className="pl-10"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => router.push('/university/notifications')}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
            ) : null}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAiOpen(true)}
            className="hidden sm:flex gap-2"
          >
            <Sparkles className="h-4 w-4 text-brand" />
            AI
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="brand" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {QUICK_ACTIONS.map((action) => (
                <DropdownMenuItem key={action.label} asChild>
                  <Link href={action.href}>{action.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                  {getInitials(session?.user?.name)}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {session?.user?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/university/profile">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>University AI Assistant</DialogTitle>
            <DialogDescription>
              Strategic, analytical insights about your institution.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {[
              'Which courses have the lowest engagement?',
              'Which students are internship ready?',
              'Which companies are most active?',
              'Generate a monthly university report.',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => askAi(q)}
                className="rounded-lg border border-border px-3 py-1.5 text-left text-xs hover:bg-muted/50"
              >
                {q}
              </button>
            ))}
          </div>
          {aiLoading ? (
            <p className="text-sm text-muted-foreground">Analyzing ecosystem…</p>
          ) : aiAnswer ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
