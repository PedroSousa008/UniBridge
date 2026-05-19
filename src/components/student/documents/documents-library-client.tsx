'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Pin,
  Search,
  Star,
  WifiOff,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  CATEGORY_ORDER,
  searchDocuments,
  type DocumentLibraryHub,
  type DocumentPreferences,
  type LibraryDocument,
  type SubjectDocumentSection,
} from '@/lib/student/student-documents';
import {
  loadLocalDocumentPrefs,
  mergePrefs,
  saveLocalDocumentPrefs,
} from '@/lib/student/documents-local-storage';

type LibraryView = 'library' | 'archived';

export function DocumentsLibraryClient({
  initialHub,
}: {
  initialHub: DocumentLibraryHub;
}) {
  const [hub, setHub] = useState(initialHub);
  const [prefs, setPrefs] = useState(initialHub.preferences);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [libraryView, setLibraryView] = useState<LibraryView>('library');
  const [preview, setPreview] = useState<LibraryDocument | null>(null);
  const [syncPending, setSyncPending] = useState(!initialHub.dbReady);

  useEffect(() => {
    const local = loadLocalDocumentPrefs();
    if (local) setPrefs(mergePrefs(local));
  }, []);

  useEffect(() => {
    if (!syncPending) return;
    fetch('/api/student/documents')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.documents) {
          setHub(data);
          setPrefs(data.preferences);
          setSyncPending(false);
        }
      });
  }, [syncPending]);

  const savePrefs = useCallback(
    async (next: DocumentPreferences) => {
      setPrefs(next);
      saveLocalDocumentPrefs(next);
      const res = await fetch('/api/student/documents/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const data = await fetch('/api/student/documents').then((r) => r.json());
        if (data?.subjects) setHub(data);
      }
    },
    []
  );

  const togglePin = (id: string) => {
    const pinnedIds = prefs.pinnedIds.includes(id)
      ? prefs.pinnedIds.filter((x) => x !== id)
      : [...prefs.pinnedIds, id];
    savePrefs({ ...prefs, pinnedIds });
  };

  const toggleStar = (id: string) => {
    const starredIds = prefs.starredIds.includes(id)
      ? prefs.starredIds.filter((x) => x !== id)
      : [...prefs.starredIds, id];
    savePrefs({ ...prefs, starredIds });
  };

  const toggleOffline = (id: string) => {
    const offlineSavedIds = prefs.offlineSavedIds.includes(id)
      ? prefs.offlineSavedIds.filter((x) => x !== id)
      : [...prefs.offlineSavedIds, id];
    savePrefs({ ...prefs, offlineSavedIds });
  };

  const openPreview = (doc: LibraryDocument) => {
    setPreview(doc);
    fetch('/api/student/documents/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id }),
    }).catch(() => {});
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return searchDocuments(hub.documents, search);
  }, [hub.documents, search]);

  const sections =
    libraryView === 'archived' ? hub.archivedSubjects : hub.subjects;

  const pinnedDocs = useMemo(() => {
    const map = new Map(hub.documents.map((d) => [d.id, d]));
    return prefs.pinnedIds.map((id) => map.get(id)).filter(Boolean) as LibraryDocument[];
  }, [hub.documents, prefs.pinnedIds]);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Documents"
        subtitle="A clean academic resource library — organized by subject, semester, and category."
      />

      {syncPending && (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          Syncing document library…
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10 h-11 rounded-xl bg-muted/30 border-transparent focus-visible:bg-background"
            placeholder="Search documents, subjects, professors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={prefs.hideCompletedSubjects}
            onChange={(e) => savePrefs({ ...prefs, hideCompletedSubjects: e.target.checked })}
          />
          Hide completed subjects
        </label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={libraryView === 'library' ? 'default' : 'outline'}
            onClick={() => setLibraryView('library')}
          >
            Library
          </Button>
          <Button
            size="sm"
            variant={libraryView === 'archived' ? 'default' : 'outline'}
            onClick={() => setLibraryView('archived')}
          >
            <Archive className="h-3.5 w-3.5 mr-1" />
            Archived
          </Button>
        </div>
      </div>

      {!searchResults && (
        <>
          {(hub.recentlyAdded.length > 0 || hub.recentlyOpened.length > 0) && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium tracking-tight text-muted-foreground uppercase">
                Recently added
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {hub.recentlyAdded.map((d) => (
                  <DocChip key={d.id} doc={d} onOpen={() => openPreview(d)} prefs={prefs} />
                ))}
              </div>
              {hub.recentlyOpened.length > 0 && (
                <>
                  <h2 className="text-sm font-medium tracking-tight text-muted-foreground uppercase mt-4">
                    Recently opened
                  </h2>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {hub.recentlyOpened.map((d) => (
                      <DocChip key={`open-${d.id}`} doc={d} onOpen={() => openPreview(d)} prefs={prefs} />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {pinnedDocs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Pin className="h-4 w-4" /> Pinned
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedDocs.map((d) => (
                  <DocumentRow
                    key={d.id}
                    doc={d}
                    prefs={prefs}
                    onPreview={() => openPreview(d)}
                    onPin={() => togglePin(d.id)}
                    onStar={() => toggleStar(d.id)}
                    onOffline={() => toggleOffline(d.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {searchResults ? (
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">{searchResults.length} results</p>
          {searchResults.map((d) => (
            <DocumentRow
              key={d.id}
              doc={d}
              prefs={prefs}
              onPreview={() => openPreview(d)}
              onPin={() => togglePin(d.id)}
              onStar={() => toggleStar(d.id)}
              onOffline={() => toggleOffline(d.id)}
            />
          ))}
        </section>
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          {libraryView === 'archived'
            ? 'No archived subjects.'
            : 'No documents yet. Materials from your subjects, assignments, and exams will appear here automatically.'}
        </p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <SubjectSection
              key={section.subjectId}
              section={section}
              expanded={!!expanded[section.subjectId]}
              onToggle={() =>
                setExpanded((e) => ({ ...e, [section.subjectId]: !e[section.subjectId] }))
              }
              prefs={prefs}
              onPreview={openPreview}
              onPin={togglePin}
              onStar={toggleStar}
              onOffline={toggleOffline}
              onArchive={() => {
                const ids = prefs.archivedSubjectIds.includes(section.subjectId)
                  ? prefs.archivedSubjectIds.filter((x) => x !== section.subjectId)
                  : [...prefs.archivedSubjectIds, section.subjectId];
                savePrefs({ ...prefs, archivedSubjectIds: ids });
              }}
            />
          ))}
        </div>
      )}

      <PreviewDialog doc={preview} onClose={() => setPreview(null)} prefs={prefs} onPin={togglePin} onStar={toggleStar} />
    </div>
  );
}

function DocChip({
  doc,
  onOpen,
  prefs,
}: {
  doc: LibraryDocument;
  onOpen: () => void;
  prefs: DocumentPreferences;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="shrink-0 w-48 rounded-xl border bg-card p-3 text-left hover:shadow-sm transition-shadow"
    >
      <p className="text-xs text-muted-foreground truncate">{doc.subjectName}</p>
      <p className="font-medium text-sm truncate mt-0.5">{doc.title}</p>
      <p className="text-xs text-muted-foreground mt-2">{CATEGORY_LABELS[doc.category]}</p>
      {prefs.starredIds.includes(doc.id) && <Star className="h-3 w-3 text-amber-500 mt-1 fill-amber-500" />}
    </button>
  );
}

function SubjectSection({
  section,
  expanded,
  onToggle,
  prefs,
  onPreview,
  onPin,
  onStar,
  onOffline,
  onArchive,
}: {
  section: SubjectDocumentSection;
  expanded: boolean;
  onToggle: () => void;
  prefs: DocumentPreferences;
  onPreview: (d: LibraryDocument) => void;
  onPin: (id: string) => void;
  onStar: (id: string) => void;
  onOffline: (id: string) => void;
  onArchive: () => void;
}) {
  const meta = [section.semester, section.academicYear ? `Year ${section.academicYear}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="rounded-2xl border bg-card/50 overflow-hidden transition-all duration-200">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <FolderOpen className="h-5 w-5 text-brand shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{section.subjectName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {section.subjectCode}
            {meta ? ` · ${meta}` : ''}
            {section.professor ? ` · ${section.professor}` : ''}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {section.documentCount}
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 space-y-6 border-t border-border/40">
            {CATEGORY_ORDER.map((cat) => {
              const items = section.categories[cat];
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <div className="space-y-1">
                    {items.map((d) => (
                      <DocumentRow
                        key={d.id}
                        doc={d}
                        prefs={prefs}
                        compact
                        onPreview={() => onPreview(d)}
                        onPin={() => onPin(d.id)}
                        onStar={() => onStar(d.id)}
                        onOffline={() => onOffline(d.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {section.documentCount === 0 && (
              <p className="text-sm text-muted-foreground">No files in this subject yet.</p>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/student/academics/subjects/${section.subjectId}/content`}>
                Open subject materials
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  prefs,
  compact,
  onPreview,
  onPin,
  onStar,
  onOffline,
}: {
  doc: LibraryDocument;
  prefs: DocumentPreferences;
  compact?: boolean;
  onPreview: () => void;
  onPin: () => void;
  onStar: () => void;
  onOffline: () => void;
}) {
  const href = doc.fileUrl || doc.url;
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl hover:bg-muted/40 transition-colors',
        compact ? 'px-2 py-2' : 'px-3 py-3 border border-transparent hover:border-border/60'
      )}
    >
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <button type="button" className="flex-1 min-w-0 text-left" onClick={onPreview}>
        <p className="text-sm font-medium truncate">{doc.title}</p>
        {!compact && (
          <p className="text-xs text-muted-foreground truncate">
            {doc.subjectName} · {CATEGORY_LABELS[doc.category]}
            {doc.professor ? ` · ${doc.professor}` : ''}
          </p>
        )}
      </button>
      <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onStar}
          aria-label="Star"
        >
          <Star
            className={cn(
              'h-3.5 w-3.5',
              prefs.starredIds.includes(doc.id) && 'fill-amber-500 text-amber-500'
            )}
          />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onPin} aria-label="Pin">
          <Pin
            className={cn(
              'h-3.5 w-3.5',
              prefs.pinnedIds.includes(doc.id) && 'fill-primary text-primary'
            )}
          />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onOffline}
          aria-label="Save offline"
          title="Save for offline (bookmark)"
        >
          <WifiOff
            className={cn(
              'h-3.5 w-3.5',
              prefs.offlineSavedIds.includes(doc.id) && 'text-brand'
            )}
          />
        </Button>
        {doc.previewType !== 'none' && (
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        {href && doc.downloadable && (
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" asChild>
            <a href={href} download target="_blank" rel="noreferrer">
              <Download className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function PreviewDialog({
  doc,
  onClose,
  prefs,
  onPin,
  onStar,
}: {
  doc: LibraryDocument | null;
  onClose: () => void;
  prefs: DocumentPreferences;
  onPin: (id: string) => void;
  onStar: (id: string) => void;
}) {
  if (!doc) return null;
  const url = doc.previewUrl;

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-8">{doc.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {doc.subjectName} · {CATEGORY_LABELS[doc.category]}
            {doc.semester ? ` · ${doc.semester}` : ''}
          </p>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onPin(doc.id)}>
            <Pin className="h-3 w-3 mr-1" />
            {prefs.pinnedIds.includes(doc.id) ? 'Unpin' : 'Pin'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onStar(doc.id)}>
            <Star className="h-3 w-3 mr-1" />
            {prefs.starredIds.includes(doc.id) ? 'Unstar' : 'Star'}
          </Button>
          {url && (
            <Button size="sm" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-[50vh] rounded-xl border bg-muted/20 overflow-hidden">
          {doc.previewType === 'pdf' && url ? (
            <iframe title={doc.title} src={url} className="w-full h-[60vh] border-0" />
          ) : doc.previewType === 'image' && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={doc.title} className="max-h-[60vh] mx-auto object-contain" />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-sm text-muted-foreground p-8 text-center">
              <FileText className="h-10 w-10 mb-3 opacity-40" />
              <p>Preview not available for this file type.</p>
              {url && (
                <Button className="mt-4" variant="outline" asChild>
                  <a href={url} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Added {format(parseISO(doc.createdAt), 'PP')}
          {doc.professor ? ` · ${doc.professor}` : ''}
        </p>
      </DialogContent>
    </Dialog>
  );
}
