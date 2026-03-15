"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { formatCedis } from "@/lib/utils/currency";

type RecommendationItem = {
  product: {
    id: string;
    slug: string;
    title: string;
    retailPrice: number;
    images?: Array<{ url: string; altText?: string | null }>;
    brand?: { name: string } | null;
    category?: { name: string } | null;
  };
  reason: string;
};

type RecommendationGridProps = {
  items: RecommendationItem[];
  context: "home" | "shop";
};

async function trackRecommendationEvent(name: string, metadata: Record<string, unknown>) {
  try {
    await fetch("/api/advanced/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, metadata }),
    });
  } catch {
    // non-blocking analytics
  }
}

export default function RecommendationGrid({ items, context }: RecommendationGridProps) {
  useEffect(() => {
    void trackRecommendationEvent("recommendation_impression", {
      context,
      count: items.length,
      productIds: items.map((item) => item.product.id),
    });
  }, [context, items]);

  if (!items.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.product.id} className="soft-card rounded-2xl p-3 sm:p-4">
          <Link
            href={`/product/${item.product.slug}`}
            className="group block"
            onClick={() => {
              void trackRecommendationEvent("recommendation_click", {
                context,
                productId: item.product.id,
                reason: item.reason,
              });
            }}
          >
            <div className="relative mb-3 h-52 overflow-hidden rounded-xl bg-[var(--surface-2)]">
              {item.product.images?.[0]?.url ? (
                <Image
                  src={item.product.images[0].url}
                  alt={item.product.images[0].altText ?? item.product.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">No image</div>
              )}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--primary-strong)]">{item.reason}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {item.product.brand?.name ?? "Unbranded"} • {item.product.category?.name}
            </p>
            <h3 className="mt-1 line-clamp-2 text-base font-black text-[var(--foreground)]">{item.product.title}</h3>
            <p className="mt-2 text-lg font-black text-[var(--foreground)]">{formatCedis(Number(item.product.retailPrice || 0))}</p>
          </Link>
        </article>
      ))}
    </div>
  );
}
