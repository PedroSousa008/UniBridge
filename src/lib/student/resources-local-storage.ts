const KEY = 'unibridge-resource-prefs';

export interface ResourcePreferences {
  savedIds: string[];
  pinnedIds: string[];
  favoriteIds: string[];
  quickLists: { id: string; name: string; resourceIds: string[] }[];
}

export const DEFAULT_RESOURCE_PREFS: ResourcePreferences = {
  savedIds: [],
  pinnedIds: [],
  favoriteIds: [],
  quickLists: [{ id: 'quick-default', name: 'Quick access', resourceIds: [] }],
};

export function loadLocalResourcePrefs(): ResourcePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResourcePreferences;
  } catch {
    return null;
  }
}

export function saveLocalResourcePrefs(prefs: ResourcePreferences): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
