"use client";

import { useState } from "react";

interface AddToCartButtonProps {
  userId?: string;
  productId: string;
  variantId?: string;
  productTitle?: string;
  unitPrice?: number;
}

type GuestCartItem = {
  productId: string;
  variantId?: string;
  title: string;
  unitPrice: number;
  quantity: number;
};

const GUEST_CART_KEY = "guest_cart_items";

export function AddToCartButton({ userId, productId, variantId, productTitle = "Product", unitPrice = 0 }: AddToCartButtonProps) {
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<string | null>(null);

  async function onAdd() {
    const safeQty = Math.max(1, Math.floor(Number(qty) || 1));
    setQty(safeQty);

    if (!userId) {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      const items: GuestCartItem[] = raw ? JSON.parse(raw) : [];
      const existingIndex = items.findIndex((item) => item.productId === productId && (item.variantId || "") === (variantId || ""));

      if (existingIndex >= 0) {
        items[existingIndex].quantity += safeQty;
      } else {
        items.push({
          productId,
          variantId,
          title: productTitle,
          unitPrice,
          quantity: safeQty,
        });
      }

      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
      setStatus("Added to bag");
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    setStatus("Adding...");
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, productId, variantId, quantity: safeQty }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Failed to add");
    } else {
      setStatus("Added to bag");
      setTimeout(() => setStatus(null), 3000);
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-3 h-12">
        <div className="relative w-24 shrink-0">
          <label htmlFor="cart-qty" className="sr-only">Quantity</label>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500 text-sm">
            Qty
          </div>
          <input
            id="cart-qty"
            type="number"
            value={qty}
            min={1}
            onChange={(e) => setQty(Number(e.target.value) || 1)}
            className="h-full w-full rounded-md border border-zinc-200 bg-white pl-10 pr-3 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
          />
        </div>
        <button 
          onClick={onAdd} 
          className="flex-1 rounded-md bg-black px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-400"
          disabled={status === "Adding..."}
        >
          {status === "Adding..." ? "Adding to Bag..." : "Add to Bag"}
        </button>
      </div>
      {status && status !== "Adding..." && (
        <p className="text-sm font-medium text-green-600 animate-in fade-in slide-in-from-bottom-1">{status}</p>
      )}
    </div>
  );
}
