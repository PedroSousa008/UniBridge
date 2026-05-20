import type { ResourceHubCategory, ResourceScope } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureResourceTables } from '@/lib/db/ensure-resources-schema';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CURATED_RESOURCES,
  type CuratedResourceSeed,
} from '@/lib/student/resources-seed';

export { CATEGORY_LABELS, CATEGORY_ORDER };

export interface ResourceCard {
  id: string;
  title: string;
  description: string;
  category: ResourceHubCategory;
  subcategory: string | null;
  scope: ResourceScope;
  href: string;
  iconKey: string;
  tags: string[];
  keywords: string;
  subjectId: string | null;
  subjectName: string | null;
  recommendedBy: string | null;
  isOfficial: boolean;
  isTrending: boolean;
  saveCount: number;
  isSaved: boolean;
  isPinned: boolean;
  isFavorite: boolean;
  recommendationReason: string | null;
}

export interface SubjectResourceGroup {
  subjectId: string;
  subjectName: string;
  resources: ResourceCard[];
}

export interface ResourcePreferences {
  savedIds: string[];
  pinnedIds: string[];
  favoriteIds: string[];
  quickLists: { id: string; name: string; resourceIds: string[] }[];
}

export interface ResourcesHub {
  resources: ResourceCard[];
  byCategory: Record<ResourceHubCategory, ResourceCard[]>;
  recommended: ResourceCard[];
  professorRecommended: ResourceCard[];
  trending: ResourceCard[];
  subjectGroups: SubjectResourceGroup[];
  officialUniversity: ResourceCard[];
  saved: ResourceCard[];
  pinned: ResourceCard[];
  favorites: ResourceCard[];
  preferences: ResourcePreferences;
  dbReady: boolean;
}

export const DEFAULT_RESOURCE_PREFS: ResourcePreferences = {
  savedIds: [],
  pinnedIds: [],
  favoriteIds: [],
  quickLists: [{ id: 'quick-default', name: 'Quick access', resourceIds: [] }],
};

function seedToCard(
  seed: CuratedResourceSeed,
  extra?: Partial<ResourceCard>
): Omit<ResourceCard, 'isSaved' | 'isPinned' | 'isFavorite' | 'recommendationReason'> {
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    subcategory: seed.subcategory,
    scope: seed.scope,
    href: seed.internalPath ?? seed.url ?? '#',
    iconKey: seed.iconKey,
    tags: seed.tags,
    keywords: seed.keywords,
    subjectId: null,
    subjectName: null,
    recommendedBy: null,
    isOfficial: seed.isOfficial ?? false,
    isTrending: seed.isTrending ?? false,
    saveCount: seed.saveCount ?? 0,
    ...extra,
  };
}

function matchesSubject(subjectName: string, seed: CuratedResourceSeed): boolean {
  if (!seed.subjectTags?.length) return false;
  const name = subjectName.toLowerCase();
  return seed.subjectTags.some((t) => name.includes(t.toLowerCase()));
}

function applyPrefs(
  cards: Omit<ResourceCard, 'isSaved' | 'isPinned' | 'isFavorite' | 'recommendationReason'>[],
  prefs: ResourcePreferences
): ResourceCard[] {
  const saved = new Set(prefs.savedIds);
  const pinned = new Set(prefs.pinnedIds);
  const favorites = new Set(prefs.favoriteIds);
  return cards.map((c) => ({
    ...c,
    isSaved: saved.has(c.id),
    isPinned: pinned.has(c.id),
    isFavorite: favorites.has(c.id),
    recommendationReason: null,
  }));
}

export function searchResources(resources: ResourceCard[], query: string): ResourceCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return resources;
  const terms = q.split(/\s+/).filter(Boolean);
  return resources.filter((r) => {
    const haystack = [
      r.title,
      r.description,
      r.keywords,
      r.subcategory ?? '',
      CATEGORY_LABELS[r.category],
      ...r.tags,
      r.subjectName ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

export async function loadStudentResourcesHub(studentId: string): Promise<ResourcesHub> {
  const dbReady = await ensureResourceTables();

  const [profile, enrollments] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { universityId: true },
    }),
    prisma.subjectEnrollment.findMany({
      where: { studentId },
      include: {
        subject: {
          include: { teacher: { include: { user: { select: { name: true } } } } },
        },
      },
    }),
  ]);

  const subjectIds = enrollments.map((e) => e.subjectId);

  const [dbItems, prefsRow] = await Promise.all([
    dbReady
      ? prisma.resourceCatalogItem.findMany({
          where: {
            OR: [
              { universityId: null, subjectId: null },
              ...(profile?.universityId ? [{ universityId: profile.universityId }] : []),
              { subjectId: { in: subjectIds } },
            ],
          },
          orderBy: [{ sortOrder: 'asc' }, { saveCount: 'desc' }],
        })
      : Promise.resolve([]),
    dbReady
      ? prisma.studentResourcePreference.findUnique({ where: { studentId } })
      : Promise.resolve(null),
  ]);

  const activeEnrollments = enrollments.filter((e) => e.subject.status === 'ACTIVE');

  let prefs: ResourcePreferences = DEFAULT_RESOURCE_PREFS;
  if (prefsRow) {
    prefs = {
      savedIds: prefsRow.savedIds ?? [],
      pinnedIds: prefsRow.pinnedIds ?? [],
      favoriteIds: prefsRow.favoriteIds ?? [],
      quickLists:
        (prefsRow.quickLists as ResourcePreferences['quickLists']) ??
        DEFAULT_RESOURCE_PREFS.quickLists,
    };
  }

  const subjectMap = new Map(
    activeEnrollments.map((e) => [
      e.subjectId,
      { name: e.subject.name, professor: e.subject.teacher?.user?.name ?? null },
    ])
  );

  const seedCards = CURATED_RESOURCES.map((s) => seedToCard(s));

  const dbCards = dbItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    scope: item.scope,
    href: item.internalPath ?? item.url ?? '#',
    iconKey: item.iconKey,
    tags: item.tags,
    keywords: item.keywords,
    subjectId: item.subjectId,
    subjectName: item.subjectId ? subjectMap.get(item.subjectId)?.name ?? null : null,
    recommendedBy: item.recommendedById
      ? subjectMap.get(item.subjectId ?? '')?.professor ?? 'Professor'
      : null,
    isOfficial: item.isOfficial,
    isTrending: item.isTrending,
    saveCount: item.saveCount,
  }));

  const merged = new Map<string, Omit<ResourceCard, 'isSaved' | 'isPinned' | 'isFavorite' | 'recommendationReason'>>();
  for (const c of seedCards) merged.set(c.id, c);
  for (const c of dbCards) merged.set(c.id, c);

  let resources = applyPrefs([...merged.values()], prefs);

  const recommended: ResourceCard[] = [];
  const professorRecommended: ResourceCard[] = [];
  const subjectGroups: SubjectResourceGroup[] = [];

  for (const e of activeEnrollments) {
    const subjectName = e.subject.name;
    const matched = resources.filter(
      (r) =>
        r.subjectId === e.subjectId ||
        CURATED_RESOURCES.some((s) => s.id === r.id && matchesSubject(subjectName, s))
    );
    if (matched.length > 0) {
      subjectGroups.push({
        subjectId: e.subjectId,
        subjectName,
        resources: matched.map((r) => ({
          ...r,
          recommendationReason: `Recommended for ${subjectName}`,
        })),
      });
      for (const r of matched.slice(0, 3)) {
        if (!recommended.find((x) => x.id === r.id)) {
          recommended.push({
            ...r,
            recommendationReason: `For ${subjectName}`,
          });
        }
      }
    }
  }

  for (const r of resources) {
    if (r.recommendedBy) {
      professorRecommended.push({
        ...r,
        recommendationReason: `Recommended by ${r.recommendedBy}`,
      });
    }
  }

  const trending = [...resources]
    .filter((r) => r.isTrending || r.saveCount >= 350)
    .sort((a, b) => b.saveCount - a.saveCount)
    .slice(0, 8)
    .map((r) => ({ ...r, recommendationReason: 'Trending among students' }));

  for (const t of trending) {
    if (!recommended.find((x) => x.id === t.id)) recommended.push(t);
  }

  const officialUniversity = resources.filter(
    (r) => r.category === 'UNIVERSITY' && r.isOfficial
  );

  const saved = resources.filter((r) => r.isSaved);
  const pinned = resources.filter((r) => r.isPinned);
  const favorites = resources.filter((r) => r.isFavorite);

  const byCategory = {} as Record<ResourceHubCategory, ResourceCard[]>;
  for (const cat of CATEGORY_ORDER) {
    byCategory[cat] = resources.filter((r) => r.category === cat);
  }

  return {
    resources,
    byCategory,
    recommended: recommended.slice(0, 12),
    professorRecommended,
    trending,
    subjectGroups,
    officialUniversity,
    saved,
    pinned,
    favorites,
    preferences: prefs,
    dbReady,
  };
}

export async function incrementResourceSaveCount(resourceId: string): Promise<void> {
  if (resourceId.startsWith('seed-')) return;
  await prisma.resourceCatalogItem
    .update({
      where: { id: resourceId },
      data: { saveCount: { increment: 1 } },
    })
    .catch(() => {});
}
