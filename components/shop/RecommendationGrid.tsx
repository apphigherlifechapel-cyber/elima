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
    <div className="relative -mx-5 px-5 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
      <div className="flex gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:pb-0">
        {items.map((item) => (
          <article key={item.product.id} className="premium-card min-w-[280px] rounded-3xl p-4 sm:min-w-0">
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
              <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-100">
                {item.product.images?.[0]?.url ? (
                  <Image
                    src={item.product.images[0].url}
                    alt={item.product.images[0].altText ?? item.product.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-400">No image</div>
                )}
                <div className="absolute left-3 top-3">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 backdrop-blur shadow-sm">
                    {item.reason}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  {item.product.brand?.name ?? "Premium"} • {item.product.category?.name}
                </p>
                <h3 className="line-clamp-2 text-lg font-black tracking-tight text-zinc-900 group-hover:text-emerald-700 transition-colors">
                  {item.product.title}
                </h3>
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xl font-black text-emerald-900">{formatCedis(Number(item.product.retailPrice || 0))}</p>
                  <div className="rounded-full bg-zinc-100 p-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

