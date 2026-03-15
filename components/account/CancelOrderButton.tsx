"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CancelOrderButtonProps = {
  orderId: string;
};

export default function CancelOrderButton({ orderId }: CancelOrderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to cancel order");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while cancelling order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {loading ? "Cancelling..." : "Cancel"}
      </button>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
