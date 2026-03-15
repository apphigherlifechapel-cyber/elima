import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateLimitEntry>();

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = memoryStore.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  memoryStore.set(key, current);
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

let upstashClient: UpstashRedis | null = null;
let ioredisClient: Redis | null = null;

function getUpstashClient() {
  if (upstashClient) return upstashClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  upstashClient = new UpstashRedis({ url, token });
  return upstashClient;
}

function getIoRedisClient() {
  if (ioredisClient) return ioredisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  ioredisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  return ioredisClient;
}

async function upstashRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const client = getUpstashClient();
  if (!client) return null;

  const now = Date.now();
  const ttlMs = Math.max(1, windowMs);
  const redisKey = `rl:${key}`;

  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.pexpire(redisKey, ttlMs);
  }

  const pttl = await client.pttl(redisKey);
  const resetAt = now + (pttl > 0 ? pttl : ttlMs);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

async function ioRedisRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const client = getIoRedisClient();
  if (!client) return null;

  const now = Date.now();
  const ttlMs = Math.max(1, windowMs);
  const redisKey = `rl:${key}`;

  if (client.status === "wait") {
    await client.connect();
  }

  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.pexpire(redisKey, ttlMs);
  }

  const pttl = await client.pttl(redisKey);
  const resetAt = now + (pttl > 0 ? pttl : ttlMs);

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

export async function checkRateLimitAsync(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const upstash = await upstashRateLimit(key, limit, windowMs);
    if (upstash) return upstash;
  } catch {
    // fall through to next provider
  }

  try {
    const io = await ioRedisRateLimit(key, limit, windowMs);
    if (io) return io;
  } catch {
    // fall through to memory fallback
  }

  return memoryRateLimit(key, limit, windowMs);
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  return memoryRateLimit(key, limit, windowMs);
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "unknown";
}
