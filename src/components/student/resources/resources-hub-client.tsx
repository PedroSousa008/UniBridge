'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  Calculator,
  Calendar,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  HeartHandshake,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Notebook,
  Palette,
  PenLine,
  Pin,
  Presentation,
  Rocket,
  Scale,
  Search,
  Sigma,
  Star,
  Target,
  Bookmark,
  TrendingUp,
  Code,
  Link2,
  Heart,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  searchResources,
  type ResourceCard,
  type ResourcesHub,
  type ResourcePreferences,
} from '@/lib/student/student-resources';
import type { ResourceHubCategory, ResourceScope } from '@prisma/client';
import {
  DEFAULT_RESOURCE_PREFS,
  loadLocalResourcePrefs,
  saveLocalResourcePrefs,
} from '@/lib/student/resources-local-storage';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'file-text': FileText,
  palette: Palette,
  linkedin: Briefcase,
  'message-circle': MessageCircle,
  globe: Globe,
  briefcase: Briefcase,
  target: Target,
  presentation: Presentation,
  'bar-chart': BarChart3,
  'layout-grid': LayoutGrid,
  code: Code,
  rocket: Rocket,
  'book-open': BookOpen,
  scale: Scale,
  'heart-handshake': HeartHandshake,
  calendar: Calendar,
  'graduation-cap': GraduationCap,
  'map-pin': MapPin,
  'book-marked': BookMarked,
  calculator: Calculator,
  sigma: Sigma,
  'pen-line': PenLine,
  'folder-open': FolderOpen,
  notebook: Notebook,
  'clipboard-list': ClipboardList,
  link: Link2,
};

type ViewId = 'all' | 'saved' | 'favorites';
type ScopeFilter = 'ALL' | ResourceScope;

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'saved', label: 'Saved' },
  { id: 'favorites', label: 'Favorites' },
];

function ResourceIcon({ iconKey }: { iconKey: string }) {
  const Icon = ICONS[iconKey] ?? Link2;
  return <Icon className="h-5 w-5" />;
}

type ResourceAction = 'save' | 'unsave' | 'pin' | 'unpin' | 'favorite' | 'unfavorite';

function ResourceCardTile({
  resource,
  onAction,
}: {
  resource: ResourceCard;
  onAction: (id: string, action: ResourceAction) => void;
}) {
  const isExternal = resource.scope === 'EXTERNAL';
  const openHref = resource.href;

  return (
    <Card className="group flex flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              resource.isOfficial ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
            )}
          >
            <ResourceIcon iconKey={resource.iconKey} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {CATEGORY_LABELS[resource.category]}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {isExternal ? 'External' : 'Internal'}
              </Badge>
              {resource.isOfficial && (
                <Badge className="bg-emerald-600 text-[10px] text-white">Official</Badge>
              )}
              {resource.recommendationReason && (
                <Badge variant="brand" className="text-[10px]">
                  Recommended
                </Badge>
              )}
            </div>
            <p className="mt-1 font-semibold leading-snug">{resource.title}</p>
            {resource.subcategory && (
              <p className="text-xs text-muted-foreground">{resource.subcategory}</p>
            )}
          </div>
        </div>
        <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {resource.description}
        </p>
        {resource.subjectName && (
          <p className="mt-2 text-xs text-brand">{resource.subjectName}</p>
        )}
        {resource.recommendationReason && (
          <p className="mt-1 text-[10px] text-muted-foreground">{resource.recommendationReason}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {isExternal ? (
            <Button size="sm" asChild>
              <a href={openHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open
              </a>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href={openHref}>Open</Link>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(resource.id, resource.isSaved ? 'unsave' : 'save')}
          >
            <Bookmark className={cn('mr-1 h-3.5 w-3.5', resource.isSaved && 'fill-current')} />
            {resource.isSaved ? 'Saved' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(resource.id, resource.isFavorite ? 'unfavorite' : 'favorite')}
          >
            <Star className={cn('h-3.5 w-3.5', resource.isFavorite && 'fill-amber-400 text-amber-500')} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(resource.id, resource.isPinned ? 'unpin' : 'pin')}
          >
            <Pin className={cn('h-3.5 w-3.5', resource.isPinned && 'fill-current')} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceGrid({
  items,
  onAction,
  empty,
}: {
  items: ResourceCard[];
  onAction: (id: string, action: ResourceAction) => void;
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{empty ?? 'No resources.'}</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <ResourceCardTile key={r.id} resource={r} onAction={onAction} />
      ))}
    </div>
  );
}

export function ResourcesHubClient({ initialHub }: { initialHub: ResourcesHub }) {
  const [hub, setHub] = useState(initialHub);
  const [prefs, setPrefs] = useState(initialHub.preferences);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewId>('all');
  const [category, setCategory] = useState<ResourceHubCategory | ''>('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [syncPending, setSyncPending] = useState(!initialHub.dbReady);

  useEffect(() => {
    const local = loadLocalResourcePrefs();
    if (local) setPrefs(local);
  }, []);

  useEffect(() => {
    if (!syncPending) return;
    fetch('/api/student/resources')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.resources) {
          setHub(data);
          setPrefs(data.preferences);
          setSyncPending(false);
        }
      });
  }, [syncPending]);

  const applyPrefsToHub = useCallback((next: ResourcePreferences) => {
    setPrefs(next);
    saveLocalResourcePrefs(next);
    setHub((h) => {
      const patch = (r: ResourceCard) => ({
        ...r,
        isSaved: next.savedIds.includes(r.id),
        isPinned: next.pinnedIds.includes(r.id),
        isFavorite: next.favoriteIds.includes(r.id),
      });
      const resources = h.resources.map(patch);
      return {
        ...h,
        preferences: next,
        resources,
        saved: resources.filter((r) => r.isSaved),
        pinned: resources.filter((r) => r.isPinned),
        favorites: resources.filter((r) => r.isFavorite),
      };
    });
  }, []);

  const handleAction = useCallback(
    async (resourceId: string, action: ResourceAction) => {
      const next = { ...prefs };
      const toggle = (list: string[], add: boolean) =>
        add ? [...new Set([...list, resourceId])] : list.filter((id) => id !== resourceId);

      if (action === 'save') next.savedIds = toggle(next.savedIds, true);
      if (action === 'unsave') next.savedIds = toggle(next.savedIds, false);
      if (action === 'pin') next.pinnedIds = toggle(next.pinnedIds, true);
      if (action === 'unpin') next.pinnedIds = toggle(next.pinnedIds, false);
      if (action === 'favorite') next.favoriteIds = toggle(next.favoriteIds, true);
      if (action === 'unfavorite') next.favoriteIds = toggle(next.favoriteIds, false);

      applyPrefsToHub(next);

      const res = await fetch('/api/student/resources/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) applyPrefsToHub(data.preferences);
      } else if (res.status === 503) {
        saveLocalResourcePrefs(next);
      }
    },
    [prefs, applyPrefsToHub]
  );

  const filtered = useMemo(() => {
    let list = hub.resources;
    if (view === 'saved') list = list.filter((r) => r.isSaved);
    if (view === 'favorites') list = list.filter((r) => r.isFavorite);
    if (category) list = list.filter((r) => r.category === category);
    if (scopeFilter !== 'ALL') list = list.filter((r) => r.scope === scopeFilter);
    if (search.trim()) list = searchResources(list, search);
    return list;
  }, [hub.resources, view, category, scopeFilter, search]);

  const showSections = view === 'all' && !search.trim() && !category && scopeFilter === 'ALL';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        subtitle="Curated tools for academic, professional, and personal growth — organized and actionable."
      />

      {!hub.dbReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Syncing preferences… Saves work locally until the database is ready.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Button
            key={v.id}
            size="sm"
            variant={view === v.id ? 'default' : 'outline'}
            onClick={() => setView(v.id)}
          >
            {v.label}
            {v.id === 'saved' && hub.saved.length > 0 && (
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">{hub.saved.length}</span>
            )}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools, keywords, categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as ResourceHubCategory | '')}
          >
            <option value="">All categories</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
          >
            <option value="ALL">Internal & External</option>
            <option value="INTERNAL">Internal only</option>
            <option value="EXTERNAL">External only</option>
          </select>
        </CardContent>
      </Card>

      {showSections && hub.pinned.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Pin className="h-4 w-4" /> Pinned
          </h2>
          <ResourceGrid items={hub.pinned} onAction={handleAction} />
        </section>
      )}

      {showSections && hub.recommended.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" /> Recommended for you
          </h2>
          <ResourceGrid items={hub.recommended} onAction={handleAction} />
        </section>
      )}

      {showSections && hub.professorRecommended.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <GraduationCap className="h-4 w-4" /> Professor recommended
          </h2>
          <ResourceGrid items={hub.professorRecommended} onAction={handleAction} />
        </section>
      )}

      {showSections && hub.officialUniversity.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Heart className="h-4 w-4" /> Official university resources
          </h2>
          <ResourceGrid items={hub.officialUniversity} onAction={handleAction} />
        </section>
      )}

      {showSections ? (
        CATEGORY_ORDER.map((cat) => {
          const items = hub.byCategory[cat];
          if (!items?.length) return null;
          return (
            <section key={cat}>
              <h2 className="mb-3 text-lg font-semibold">{CATEGORY_LABELS[cat]}</h2>
              <ResourceGrid items={items} onAction={handleAction} />
            </section>
          );
        })
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </h2>
          <ResourceGrid items={filtered} onAction={handleAction} empty="No resources match your filters." />
        </section>
      )}

      {showSections &&
        hub.subjectGroups.map((g) => (
          <section key={g.subjectId}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{g.subjectName}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResourceGrid items={g.resources} onAction={handleAction} />
              </CardContent>
            </Card>
          </section>
        ))}
    </div>
  );
}
