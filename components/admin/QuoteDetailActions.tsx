"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCedis } from "@/lib/utils/currency";

type QuoteDetailItem = {
  id: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
};

type QuoteDetailActionsProps = {
  quoteId: string;
  status: string;
  items: QuoteDetailItem[];
};

export default function QuoteDetailActions({ quoteId, status, items }: QuoteDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.id, String(item.unitPrice)]))
  );

  const previewTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const next = Number(prices[item.id] ?? item.unitPrice);
      const unit = Number.isFinite(next) && next >= 0 ? next : item.unitPrice;
      return sum + unit * item.quantity;
    }, 0);
  }, [items, prices]);

  async function runAction(action: "REVIEW" | "APPROVE" | "REJECT" | "CONVERT") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function saveReprice() {
    setLoading("REPRICE");
    setError(null);
    try {
      const itemPrices = items.map((item) => {
        const parsed = Number(prices[item.id] ?? item.unitPrice);
        return {
          itemId: item.id,
          unitPrice: Number.isFinite(parsed) && parsed >= 0 ? parsed : item.unitPrice,
        };
      });

      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, action: "REPRICE", itemPrices }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reprice failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="soft-card space-y-4 rounded-2xl p-4">
      <h3 className="text-sm font-black uppercase tracking-[0.13em] text-[var(--muted-foreground)]">Actions</h3>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => runAction("REVIEW")} disabled={!!loading} className="btn-secondary text-xs disabled:opacity-60">
          {loading === "REVIEW" ? "Reviewing..." : "Move to Review"}
        </button>
        <button onClick={() => runAction("APPROVE")} disabled={!!loading} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading === "APPROVE" ? "Approving..." : "Approve"}
        </button>
        <button onClick={() => runAction("REJECT")} disabled={!!loading} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
          {loading === "REJECT" ? "Rejecting..." : "Reject"}
        </button>
        {status === "APPROVED" ? (
          <button onClick={() => runAction("CONVERT")} disabled={!!loading} className="btn-primary text-xs disabled:opacity-60">
            {loading === "CONVERT" ? "Converting..." : "Convert to Order"}
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Item Repricing</h3>
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <p className="text-sm font-semibold">{item.productTitle}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{item.productId}</p>
            </div>
            <div className="self-center text-xs text-[var(--muted-foreground)]">Qty: {item.quantity}</div>
            <input
              type="number"
              min={0}
              step="0.01"
              value={prices[item.id] ?? String(item.unitPrice)}
              onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-sm"
            />
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-semibold">Preview total: {formatCedis(previewTotal)}</p>
          <button onClick={saveReprice} disabled={!!loading} className="btn-primary text-xs disabled:opacity-60">
            {loading === "REPRICE" ? "Saving..." : "Save Repricing"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
