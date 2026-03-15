"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type WishlistItem = {
  id: string;
  productId: string;
  variantId: string | null;
  product: {
    id: string;
    title: string;
    slug: string;
    retailPrice: number;
    images: Array<{ url: string; altText: string | null }>;
  };
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadWishlist() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load wishlist");
      } else {
        setItems(data.items || []);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWishlist();
  }, []);

  async function removeItem(item: WishlistItem) {
    setBusyId(item.id);
    setError(null);
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", wishlistItemId: item.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusyId(null);
      setError(data.error || "Failed to remove item");
      return;
    }
    await loadWishlist();
    setBusyId(null);
  }

  async function moveToCart(item: WishlistItem) {
    setBusyId(item.id);
    setError(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.productId,
        variantId: item.variantId,
        quantity: 1,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusyId(null);
      setError(data.error || "Failed to add to cart");
      return;
    }
    await removeItem(item);
    setBusyId(null);
  }

  if (loading) {
    return (
      <div className="page-wrap py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="soft-card rounded-2xl p-4">
              <div className="skeleton h-48 w-full rounded-xl" />
              <div className="skeleton mt-3 h-4 w-2/3" />
              <div className="skeleton mt-2 h-3 w-1/3" />
              <div className="mt-3 flex gap-2">
                <div className="skeleton h-8 w-24" />
                <div className="skeleton h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="page-wrap py-12 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <h1 className="fade-in-up text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Wishlist</h1>
        {items.length === 0 ? (
          <div className="glass fade-in-up mt-4 rounded-2xl p-6 text-sm text-[var(--muted-foreground)]">
            Wishlist is empty. <Link href="/shop" className="font-bold text-[var(--primary)] hover:text-[var(--primary-strong)]">Browse products</Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <div key={item.id} className={`soft-card fade-in-up rounded-2xl p-4 ${index < 4 ? `stagger-${index + 1}` : ""}`}>
                <Link href={`/product/${item.product.slug}`}>
                  <div className="relative h-48 w-full overflow-hidden rounded-xl bg-[var(--surface-2)]">
                    {item.product.images[0]?.url ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.product.images[0].altText || item.product.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">No image</div>
                    )}
                  </div>
                </Link>
                <h2 className="mt-3 text-base font-black text-[var(--foreground)]">{item.product.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">GHS {item.product.retailPrice.toFixed(2)}</p>
                <div className="mt-3 flex gap-2">
                  <button disabled={busyId === item.id} onClick={() => moveToCart(item)} className="btn-primary rounded-full px-3 py-2 text-xs font-bold disabled:opacity-60">
                    {busyId === item.id ? "Updating..." : "Move to cart"}
                  </button>
                  <button disabled={busyId === item.id} onClick={() => removeItem(item)} className="btn-secondary rounded-full px-3 py-2 text-xs font-bold disabled:opacity-60">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


