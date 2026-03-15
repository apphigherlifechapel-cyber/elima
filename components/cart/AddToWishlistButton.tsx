"use client";

import { useState } from "react";

interface WishlistButtonProps {
  productId: string;
  variantId?: string | null;
}

export default function AddToWishlistButton({ productId, variantId = null }: WishlistButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function onClick() {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", productId, variantId }),
      });
      if (!res.ok) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <button 
      onClick={onClick} 
      disabled={loading} 
      className="flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-red-500 disabled:opacity-50"
      title="Add to Wishlist"
    >
      <svg 
        viewBox="0 0 24 24" 
        fill={status === "success" ? "currentColor" : "none"} 
        stroke="currentColor" 
        strokeWidth="2" 
        className={`h-5 w-5 ${status === "success" ? "text-red-500" : ""}`}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="sr-only">Add to Wishlist</span>
    </button>
  );
}
