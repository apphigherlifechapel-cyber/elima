"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ShopCardActionsProps = {
  userId?: string;
  productId: string;
  productTitle: string;
  unitPrice: number;
  initialInWishlist: boolean;
  disabled?: boolean;
};

type GuestCartItem = {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
};

const GUEST_CART_KEY = "guest_cart_items";

async function emitEvent(payload: { name: string; userId?: string; metadata?: Record<string, unknown> }) {
  try {
    await fetch("/api/advanced/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking analytics
  }
}

export function ShopCardActions({ userId, productId, productTitle, unitPrice, initialInWishlist, disabled = false }: ShopCardActionsProps) {
  const router = useRouter();
  const [cartStatus, setCartStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [wishLoading, setWishLoading] = useState(false);
  const [inWishlist, setInWishlist] = useState(initialInWishlist);

  async function onQuickAdd() {
    if (disabled) return;
    if (!userId) {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      const items: GuestCartItem[] = raw ? JSON.parse(raw) : [];
      const existingIndex = items.findIndex((item) => item.productId === productId);
      if (existingIndex >= 0) {
        items[existingIndex].quantity += 1;
      } else {
        items.push({ productId, title: productTitle, unitPrice, quantity: 1 });
      }
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
      await emitEvent({
        name: "add_to_bag",
        metadata: { userType: "guest", productId, quantity: 1, unitPrice },
      });
      setCartStatus("done");
      setTimeout(() => setCartStatus("idle"), 1500);
      return;
    }

    setCartStatus("loading");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, productId, quantity: 1 }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected server response" }));
      if (!res.ok) {
        console.error("Quick add failed:", data.error || res.statusText);
        setCartStatus("error");
      } else {
        setCartStatus("done");
      }
    } catch {
      setCartStatus("error");
    } finally {
      setTimeout(() => setCartStatus("idle"), 1800);
    }
  }

  async function onToggleWishlist() {
    if (!userId) {
      router.push("/login");
      return;
    }

    setWishLoading(true);
    const previous = inWishlist;
    setInWishlist(!previous);

    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: previous ? "remove" : "add",
          productId,
        }),
      });
      if (!res.ok) setInWishlist(previous);
    } catch {
      setInWishlist(previous);
    } finally {
      setWishLoading(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onQuickAdd}
        disabled={cartStatus === "loading" || disabled}
        className="btn-primary flex-1 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-60"
      >
        {disabled ? "Out of Stock" : cartStatus === "loading" ? "Adding..." : cartStatus === "done" ? "Added" : cartStatus === "error" ? "Try again" : "Quick Add"}
      </button>

      <button
        type="button"
        onClick={onToggleWishlist}
        disabled={wishLoading}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          inWishlist
            ? "border-rose-200 bg-rose-50 text-rose-600"
            : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        }`}
        title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg viewBox="0 0 24 24" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="sr-only">{inWishlist ? "Remove from wishlist" : "Add to wishlist"}</span>
      </button>
    </div>
  );
}

