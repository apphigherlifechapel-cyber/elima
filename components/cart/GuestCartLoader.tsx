"use client";

import { useMemo } from "react";
import CartViewClient from "@/components/cart/CartViewClient";

type GuestCartItem = {
  productId: string;
  variantId?: string;
  title: string;
  unitPrice: number;
  quantity: number;
};

const GUEST_CART_KEY = "guest_cart_items";

export default function GuestCartLoader() {
  const items = useMemo<GuestCartItem[]>(() => {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  }, []);

  return <CartViewClient mode="guest" items={items} />;
}
