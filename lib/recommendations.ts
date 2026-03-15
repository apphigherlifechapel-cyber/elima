import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

type RecommendationProduct = Prisma.ProductGetPayload<{
  include: {
    images: true;
    brand: true;
    category: true;
  };
}>;

type PersonalizedRecommendation = {
  product: RecommendationProduct;
  reason: string;
};

type RecommendationResult = {
  personalized: PersonalizedRecommendation[];
  trending: RecommendationProduct[];
  segment: "GUEST" | "NEW_SHOPPER" | "RETURNING" | "HIGH_VALUE" | "WHOLESALE_PRO";
};

type EventMetadata = {
  productId?: string;
  [key: string]: unknown;
};

type EventRow = Prisma.AnalyticsEventGetPayload<{ select: { name: true; metadata: true } }>;
type AffinityProduct = Prisma.ProductGetPayload<{ select: { id: true; categoryId: true } }>;
type SettingRow = Prisma.SettingGetPayload<Record<string, never>>;

type CacheEntry = {
  expiresAt: number;
  value: RecommendationResult;
};

type WeightConfig = {
  view: number;
  addToBag: number;
  purchase: number;
  categoryAffinity: number;
  wholesaleBoost: number;
  valueBoost: number;
  newcomerPriceBoost: number;
  popularityBoost: number;
};

const recCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function parseProductId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const typed = metadata as EventMetadata;
  return typeof typed.productId === "string" && typed.productId ? typed.productId : null;
}

function reasonFromEvent(eventName: string): string {
  if (eventName === "purchase") return "Because you bought similar items";
  if (eventName === "add_to_bag") return "Based on your bag activity";
  return "Inspired by recently viewed items";
}

function getCacheKey(userId: string | undefined, take: number) {
  return `${userId || "guest"}:${take}`;
}

function parseNum(value: string | null | undefined, fallback: number) {
  const n = Number(value || "");
  return Number.isFinite(n) ? n : fallback;
}

async function loadWeightConfig(): Promise<WeightConfig> {
  const keys = [
    "rec_weight_view",
    "rec_weight_add_to_bag",
    "rec_weight_purchase",
    "rec_weight_category_affinity",
    "rec_weight_wholesale_boost",
    "rec_weight_value_boost",
    "rec_weight_newcomer_price_boost",
    "rec_weight_popularity_boost",
  ];

  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map: Map<string, string> = new Map(rows.map((row: SettingRow): [string, string] => [row.key, row.value]));

  return {
    view: parseNum(map.get("rec_weight_view"), 2),
    addToBag: parseNum(map.get("rec_weight_add_to_bag"), 4),
    purchase: parseNum(map.get("rec_weight_purchase"), 8),
    categoryAffinity: parseNum(map.get("rec_weight_category_affinity"), 2),
    wholesaleBoost: parseNum(map.get("rec_weight_wholesale_boost"), 4),
    valueBoost: parseNum(map.get("rec_weight_value_boost"), 2),
    newcomerPriceBoost: parseNum(map.get("rec_weight_newcomer_price_boost"), 2),
    popularityBoost: parseNum(map.get("rec_weight_popularity_boost"), 2),
  };
}

async function detectSegment(userId?: string): Promise<RecommendationResult["segment"]> {
  if (!userId) return "GUEST";

  const [user, paidStats] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } }),
    prisma.order.aggregate({
      where: { userId, status: "PAID" },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  if (user?.accountType === "WHOLESALE") return "WHOLESALE_PRO";

  const paidCount = paidStats._count._all || 0;
  const paidTotal = Number(paidStats._sum.total || 0);

  if (paidTotal >= 15000) return "HIGH_VALUE";
  if (paidCount >= 3) return "RETURNING";
  return "NEW_SHOPPER";
}

function segmentBoost(product: RecommendationProduct, segment: RecommendationResult["segment"], weights: WeightConfig) {
  let boost = 0;

  if (segment === "WHOLESALE_PRO") {
    boost += product.isWholesale ? weights.wholesaleBoost : -1;
  }

  if (segment === "HIGH_VALUE") {
    if (Number(product.retailPrice) >= 800) boost += weights.valueBoost;
  }

  if (segment === "NEW_SHOPPER") {
    if (!product.isWholesale && Number(product.retailPrice) <= 400) boost += weights.newcomerPriceBoost;
  }

  if (segment === "RETURNING") {
    if (product.stockTotal > 0) boost += 1;
  }

  return boost;
}

export async function getRecommendationsForUser(userId?: string, options?: { take?: number }): Promise<RecommendationResult> {
  const take = Math.max(1, Math.min(options?.take ?? 8, 20));
  const cacheKey = getCacheKey(userId, take);
  const now = Date.now();
  const cached = recCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const [segment, weights, userEvents, globalEvents] = await Promise.all([
    detectSegment(userId),
    loadWeightConfig(),
    prisma.analyticsEvent.findMany({
      where: {
        name: { in: ["product_view", "add_to_bag", "purchase"] },
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: userId ? 300 : 500,
      select: { name: true, metadata: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { name: { in: ["product_view", "add_to_bag", "purchase"] } },
      orderBy: { createdAt: "desc" },
      take: 1200,
      select: { name: true, metadata: true },
    }),
  ]);

  const interactionScore = new Map<string, number>();
  const reasonByProduct = new Map<string, string>();
  for (const event of userEvents as EventRow[]) {
    const productId = parseProductId(event.metadata);
    if (!productId) continue;

    const w = event.name === "purchase" ? weights.purchase : event.name === "add_to_bag" ? weights.addToBag : weights.view;
    interactionScore.set(productId, (interactionScore.get(productId) || 0) + w);

    if (!reasonByProduct.has(productId)) {
      reasonByProduct.set(productId, reasonFromEvent(event.name));
    }
  }

  const interactedIds = Array.from(interactionScore.keys()).slice(0, 80);

  const interactedProducts: AffinityProduct[] = interactedIds.length
    ? await prisma.product.findMany({ where: { id: { in: interactedIds }, isAvailable: true }, select: { id: true, categoryId: true } })
    : [];

  const categoryAffinity = interactedProducts.reduce((acc: Map<string, number>, p: AffinityProduct) => {
    acc.set(p.categoryId, (acc.get(p.categoryId) || 0) + 1);
    return acc;
  }, new Map<string, number>());

  const topCategoryIds = Array.from(categoryAffinity.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId]) => categoryId)
    .slice(0, 5);

  const globalPopularity = new Map<string, number>();
  for (const event of globalEvents as EventRow[]) {
    const productId = parseProductId(event.metadata);
    if (!productId) continue;
    globalPopularity.set(productId, (globalPopularity.get(productId) || 0) + 1);
  }

  const candidateOr: Prisma.ProductWhereInput[] = [];
  if (interactedIds.length) candidateOr.push({ id: { in: interactedIds } });
  if (topCategoryIds.length) candidateOr.push({ categoryId: { in: topCategoryIds } });

  const candidates: RecommendationProduct[] = candidateOr.length
    ? await prisma.product.findMany({
        where: { isAvailable: true, OR: candidateOr },
        include: { images: true, brand: true, category: true },
        take: 300,
        orderBy: { createdAt: "desc" },
      })
    : [];

  const scored = candidates.map((product: RecommendationProduct) => {
    const base = interactionScore.get(product.id) || 0;
    const affinity = (categoryAffinity.get(product.categoryId) || 0) * weights.categoryAffinity;
    const popularity = Math.log1p(globalPopularity.get(product.id) || 0) * weights.popularityBoost;
    const seg = segmentBoost(product, segment, weights);

    const score = base + affinity + popularity + seg;
    const reason = reasonByProduct.get(product.id) || (categoryAffinity.get(product.categoryId) ? "Popular in your favorite category" : "Trending now");

    return { product, score, reason };
  });

  const personalized = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((item) => ({ product: item.product, reason: item.reason }));

  const personalizedSet = new Set(personalized.map((item) => item.product.id));

  const trendingFromEvents = Array.from(globalPopularity.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 60);

  const trendingRaw: RecommendationProduct[] = trendingFromEvents.length
    ? await prisma.product.findMany({
        where: { id: { in: trendingFromEvents }, isAvailable: true },
        include: { images: true, brand: true, category: true },
      })
    : [];

  let trending = trendingFromEvents
    .map((id: string) => trendingRaw.find((p: RecommendationProduct) => p.id === id))
    .filter(Boolean)
    .filter((p) => !personalizedSet.has((p as RecommendationProduct).id))
    .slice(0, take) as RecommendationProduct[];

  if (trending.length < take) {
    const fill = await prisma.product.findMany({
      where: {
        isAvailable: true,
        id: {
          notIn: Array.from(new Set([...personalized.map((item) => item.product.id), ...trending.map((p) => p.id)])),
        },
      },
      include: { images: true, brand: true, category: true },
      orderBy: [{ stockTotal: "desc" }, { createdAt: "desc" }],
      take: take - trending.length,
    });

    trending = [...trending, ...fill];
  }

  const result: RecommendationResult = {
    personalized,
    trending,
    segment,
  };

  recCache.set(cacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    value: result,
  });

  if (recCache.size > 200) {
    const oldest = recCache.keys().next().value as string | undefined;
    if (oldest) recCache.delete(oldest);
  }

  return result;
}
