"use client";

import { useMemo, useState } from "react";
import AddToWishlistButton from "@/components/cart/AddToWishlistButton";
import { formatCedis } from "@/lib/utils/currency";

type VariantLite = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock: number;
  retailPrice: number;
};

type ProductPurchasePanelProps = {
  userId?: string;
  productId: string;
  productTitle: string;
  productStock: number;
  defaultRetailPrice: number;
  variants: VariantLite[];
  isWholesale: boolean;
  moq: number;
};

type GuestCartItem = {
  productId: string;
  variantId?: string;
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

export default function ProductPurchasePanel({
  userId,
  productId,
  productTitle,
  productStock,
  defaultRetailPrice,
  variants,
  isWholesale,
  moq,
}: ProductPurchasePanelProps) {
  const defaultVariantId = variants[0]?.id ?? "";
  const [selectedVariantId, setSelectedVariantId] = useState<string>(defaultVariantId);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );

  const unitPrice = selectedVariant ? Number(selectedVariant.retailPrice) : Number(defaultRetailPrice || 0);
  const availableStock = selectedVariant ? selectedVariant.stock : productStock;
  const outOfStock = availableStock <= 0;

  async function onAddToBag() {
    if (outOfStock) {
      setStatus("Out of stock");
      return;
    }
    if (qty < 1) {
      setStatus("Invalid quantity");
      return;
    }
    if (qty > availableStock) {
      setStatus("Quantity exceeds stock");
      return;
    }

    if (!userId) {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      const items: GuestCartItem[] = raw ? JSON.parse(raw) : [];
      const existingIndex = items.findIndex(
        (item) => item.productId === productId && (item.variantId || "") === (selectedVariant?.id || "")
      );

      if (existingIndex >= 0) {
        items[existingIndex].quantity += qty;
      } else {
        items.push({
          productId,
          variantId: selectedVariant?.id,
          title: productTitle,
          unitPrice,
          quantity: qty,
        });
      }

      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
      await emitEvent({
        name: "add_to_bag",
        metadata: {
          userType: "guest",
          productId,
          variantId: selectedVariant?.id || null,
          quantity: qty,
          unitPrice,
        },
      });

      setStatus("Added to bag");
      setTimeout(() => setStatus(null), 2200);
      return;
    }

    setAdding(true);
    setStatus("Adding...");
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId,
          variantId: selectedVariant?.id,
          quantity: Math.max(1, Math.floor(qty)),
        }),
      });
      const data = await response.json().catch(() => ({ error: "Unexpected server response" }));
      if (!response.ok) {
        setStatus(data.error || "Failed to add to bag");
      } else {
        setStatus("Added to bag");
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setStatus("Network error. Check connection and refresh.");
      } else {
        setStatus("Failed to add to bag");
      }
    } finally {
      setAdding(false);
      setTimeout(() => setStatus(null), 2400);
    }
  }

  return (
    <div className="soft-card rounded-3xl p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary-strong)]">Purchase Panel</p>

      {variants.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {variants.map((variant) => {
            const active = selectedVariantId === variant.id;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariantId(variant.id)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? "border-[var(--primary)] bg-[var(--surface-2)]"
                    : "border-[var(--border-soft)] bg-[var(--surface)] hover:border-[var(--primary)]/40"
                }`}
              >
                <p className="text-sm font-black text-[var(--foreground)]">
                  {variant.sku}
                  {variant.size ? ` (${variant.size})` : ""}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {variant.color || "Default"} • {formatCedis(Number(variant.retailPrice))} • {variant.stock} in stock
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">{productStock} in stock</p>
      )}

      <div className="mt-4 grid grid-cols-[86px_1fr_auto] gap-2">
        <input
          type="number"
          min={1}
          max={Math.max(availableStock, 1)}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={onAddToBag}
          disabled={adding || outOfStock}
          className="btn-primary rounded-xl px-4 py-2 text-sm font-black disabled:opacity-55"
        >
          {outOfStock ? "Out of Stock" : adding ? "Adding..." : "Add to Bag"}
        </button>
        <div className="w-11">
          <AddToWishlistButton productId={productId} variantId={selectedVariant?.id || null} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <p className="font-bold text-[var(--foreground)]">{formatCedis(unitPrice)}</p>
        {isWholesale ? <p className="text-xs text-[var(--muted-foreground)]">Wholesale MOQ: {moq}</p> : null}
      </div>

      {status ? <p className="mt-2 text-sm font-semibold text-[var(--primary-strong)]">{status}</p> : null}
    </div>
  );
}

