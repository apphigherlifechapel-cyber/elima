"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCedis } from "@/lib/utils/currency";

type SignedInCartItem = {
  id: string;
  product: { id: string; title: string };
  variant: { id: string } | null;
  quantity: number;
  unitPrice: number;
};

type GuestCartItem = {
  productId: string;
  variantId?: string;
  title: string;
  unitPrice: number;
  quantity: number;
};

const GUEST_CART_KEY = "guest_cart_items";

type CartViewClientProps =
  | {
      mode: "auth";
      items: SignedInCartItem[];
    }
  | {
      mode: "guest";
      items: GuestCartItem[];
    };

export default function CartViewClient(props: CartViewClientProps) {
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>(props.mode === "guest" ? props.items : []);

  const items = props.mode === "guest" ? guestItems : props.items;
  const total = useMemo(() => items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0), [items]);

  function clearGuestCart() {
    localStorage.removeItem(GUEST_CART_KEY);
    setGuestItems([]);
  }

  function removeGuestItem(idx: number) {
    const next = guestItems.filter((_, i) => i !== idx);
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(next));
    setGuestItems(next);
  }

  if (!items.length) {
    return (
      <div className="page-wrap flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
        <div className="glass fade-in-up rounded-3xl p-8 sm:p-12">
          <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Your Bag is Empty</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-[var(--muted-foreground)]">
            Looks like you have not added products yet. Explore the catalog and come back.
          </p>
          <Link href="/shop" className="btn-primary mt-6 inline-flex rounded-full px-6 py-2.5 text-sm font-bold">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap py-8 sm:py-12">
      <div className="mb-5 fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Shopping Bag</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{items.length} {items.length === 1 ? "item" : "items"} in your bag</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="soft-card fade-in-up stagger-1 rounded-2xl p-4 sm:p-6">
          <div className="hidden grid-cols-12 gap-4 border-b border-[var(--border-soft)] pb-3 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)] md:grid">
            <div className="col-span-6">Product</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          <ul className="divide-y divide-[var(--border-soft)]">
            {props.mode === "guest"
              ? guestItems.map((item, index) => (
                  <li key={`${item.productId}-${item.variantId || ""}-${index}`} className="grid gap-3 py-4 md:grid-cols-12 md:items-center md:gap-4">
                    <div className="col-span-6">
                      <h2 className="text-sm font-bold text-[var(--foreground)]">{item.title}</h2>
                      {item.variantId ? <p className="text-xs text-[var(--muted-foreground)]">Variant ID: {item.variantId}</p> : null}
                      <button onClick={() => removeGuestItem(index)} className="mt-2 text-xs font-bold text-red-700 hover:text-red-800">Remove</button>
                    </div>
                    <div className="col-span-2 text-sm md:text-center">{item.quantity}</div>
                    <div className="col-span-2 text-sm md:text-right">{formatCedis(item.unitPrice)}</div>
                    <div className="col-span-2 text-sm font-bold md:text-right">{formatCedis(item.unitPrice * item.quantity)}</div>
                  </li>
                ))
              : props.items.map((item) => (
                  <li key={item.id} className="grid gap-3 py-4 md:grid-cols-12 md:items-center md:gap-4">
                    <div className="col-span-6">
                      <h2 className="text-sm font-bold text-[var(--foreground)]">{item.product.title}</h2>
                      {item.variant ? <p className="text-xs text-[var(--muted-foreground)]">Variant ID: {item.variant.id}</p> : null}
                    </div>
                    <div className="col-span-2 text-sm md:text-center">{item.quantity}</div>
                    <div className="col-span-2 text-sm md:text-right">{formatCedis(item.unitPrice)}</div>
                    <div className="col-span-2 text-sm font-bold md:text-right">{formatCedis(item.unitPrice * item.quantity)}</div>
                  </li>
                ))}
          </ul>

          {props.mode === "guest" ? (
            <div className="mt-5 flex justify-between text-xs font-bold">
              <Link href="/shop" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Continue Shopping</Link>
              <button onClick={clearGuestCart} className="text-red-700 hover:text-red-800">Clear Cart</button>
            </div>
          ) : null}
        </div>

        <aside className="glass fade-in-up stagger-2 h-fit rounded-2xl p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-black text-[var(--foreground)]">Order Summary</h2>
          <div className="mt-4 space-y-3 text-sm text-[var(--muted-foreground)]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCedis(total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>At checkout</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>At checkout</span>
            </div>
          </div>
          <div className="my-5 h-px w-full bg-[var(--border-soft)]" />
          <div className="flex items-end justify-between">
            <span className="text-sm font-bold text-[var(--foreground)]">Total</span>
            <span className="text-2xl font-black text-[var(--foreground)]">{formatCedis(total)}</span>
          </div>

          {props.mode === "guest" ? (
            <div className="mt-6 space-y-2">
              <Link href="/checkout?guest=1" className="btn-primary flex h-11 w-full items-center justify-center rounded-full text-xs font-bold">
                Checkout as Guest
              </Link>
              <Link href="/login" className="btn-secondary flex h-11 w-full items-center justify-center rounded-full text-xs font-bold">
                Sign in to Checkout
              </Link>
            </div>
          ) : (
            <Link href="/checkout" className="btn-primary mt-6 flex h-11 w-full items-center justify-center rounded-full text-xs font-bold">
              Proceed to Checkout
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
