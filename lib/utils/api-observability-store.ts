export type ApiLogLevel = "info" | "warn" | "error" | "alert";

export type ApiLogEvent = {
  timestamp: string;
  level: ApiLogLevel;
  route: string;
  method?: string;
  requestId?: string;
  ip?: string;
  userId?: string | null;
  message: string;
  data?: Record<string, unknown>;
};

type ApiLogStore = {
  events: ApiLogEvent[];
  retentionMs: number;
};

const MAX_EVENTS = 3000;
const STORE_KEY = "__elima_api_observability_store__";
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;

function getStore(): ApiLogStore {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: ApiLogStore };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = { events: [], retentionMs: DEFAULT_RETENTION_MS };
  }
  return g[STORE_KEY]!;
}

function pruneExpired(store: ApiLogStore) {
  const cutoff = Date.now() - store.retentionMs;
  store.events = store.events.filter((event) => new Date(event.timestamp).getTime() >= cutoff);
}

export function addApiLogEvent(event: ApiLogEvent) {
  const store = getStore();
  store.events.push(event);
  pruneExpired(store);
  if (store.events.length > MAX_EVENTS) {
    store.events.splice(0, store.events.length - MAX_EVENTS);
  }
}

export function listApiLogEvents(params?: {
  limit?: number;
  level?: ApiLogLevel | "all";
  route?: string;
  q?: string;
}) {
  const store = getStore();
  const limit = Math.max(1, Math.min(Number(params?.limit || 200), 1000));
  const level = params?.level || "all";
  const route = params?.route?.trim().toLowerCase() || "";
  const q = params?.q?.trim().toLowerCase() || "";
  pruneExpired(store);

  const filtered = store.events.filter((event) => {
    if (level !== "all" && event.level !== level) return false;
    if (route && !event.route.toLowerCase().includes(route)) return false;
    if (q) {
      const hay = `${event.message} ${event.route} ${event.requestId || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return filtered.slice(-limit).reverse();
}

export function getApiLogSettings() {
  const store = getStore();
  return { retentionMs: store.retentionMs };
}

export function setApiLogRetentionHours(hours: number) {
  const store = getStore();
  const safeHours = Math.max(1, Math.min(24 * 30, Math.floor(hours)));
  store.retentionMs = safeHours * 60 * 60 * 1000;
  pruneExpired(store);
  return { retentionMs: store.retentionMs, retentionHours: safeHours };
}

export function clearApiLogEvents() {
  const store = getStore();
  const removed = store.events.length;
  store.events = [];
  return { removed };
}
