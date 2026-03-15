"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCedis } from "@/lib/utils/currency";

type QuoteRepriceItem = {
  id: string;
  productId: string;
  productTitle?: string | null;
  quantity: number;
  unitPrice: number;
};

type QuoteRepriceFormProps = {
  quoteId: string;
  items: QuoteRepriceItem[];
};

export default function QuoteRepriceForm({ quoteId, items }: QuoteRepriceFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  async function submit() {
    setLoading(true);
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
        body: JSON.stringify({
          quoteId,
          action: "REPRICE",
          itemPrices,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reprice quote");
        return;
      }
      router.refresh();
      setOpen(false);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-secondary text-xs">
        {open ? "Hide Reprice" : "Reprice"}
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <div className="text-xs sm:col-span-2">
                  <div className="font-semibold">{item.productTitle || item.productId}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">Qty: {item.quantity}</div>
                </div>
                <input
                  value={prices[item.id] ?? String(item.unitPrice)}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs"
                  type="number"
                  min={0}
                  step="0.01"
                />
                <div className="text-xs text-[var(--muted-foreground)]">Current: {formatCedis(item.unitPrice)}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold">Preview total: {formatCedis(previewTotal)}</span>
            <button type="button" onClick={submit} disabled={loading} className="btn-primary text-xs disabled:opacity-60">
              {loading ? "Saving..." : "Save Reprice"}
            </button>
          </div>

          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
