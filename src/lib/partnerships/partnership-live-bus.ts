export type PartnershipLiveEventType =
  | 'interest'
  | 'mutual_match'
  | 'partnership_active'
  | 'hub_refresh';

export interface PartnershipLiveEvent {
  type: PartnershipLiveEventType;
  at: string;
  payload?: Record<string, unknown>;
}

type Listener = (event: PartnershipLiveEvent) => void;

const globalStore = globalThis as unknown as {
  __partnershipListeners?: Map<string, Set<Listener>>;
};

function getStore() {
  if (!globalStore.__partnershipListeners) {
    globalStore.__partnershipListeners = new Map();
  }
  return globalStore.__partnershipListeners;
}

export function subscribePartnershipLive(userId: string, listener: Listener) {
  const store = getStore();
  if (!store.has(userId)) store.set(userId, new Set());
  store.get(userId)!.add(listener);
  return () => {
    store.get(userId)?.delete(listener);
  };
}

export function publishPartnershipLive(userIds: string[], event: PartnershipLiveEvent) {
  const store = getStore();
  for (const userId of userIds) {
    const set = store.get(userId);
    if (!set) continue;
    for (const listener of set) {
      try {
        listener(event);
      } catch {
        /* ignore listener errors */
      }
    }
  }
}
