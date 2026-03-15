"use client";

import { useState } from "react";

type InventoryAdjustButtonProps = {
  productId: string;
  stockTotal: number;
  stockReserved: number;
  isAvailable: boolean;
};

export default function InventoryAdjustButton({ productId, stockTotal, stockReserved, isAvailable }: InventoryAdjustButtonProps) {
  const [open, setOpen] = useState(false);
  const [nextStockTotal, setNextStockTotal] = useState(String(stockTotal));
  const [nextStockReserved, setNextStockReserved] = useState(String(stockReserved));
  const [nextAvailable, setNextAvailable] = useState(isAvailable);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          stockTotal: Number(nextStockTotal),
          stockReserved: Number(nextStockReserved),
          isAvailable: nextAvailable,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update inventory");
      } else {
        setMessage("Inventory updated.");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="btn-secondary text-xs">
        {open ? "Close" : "Adjust"}
      </button>
      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2.5">
          <input className="w-24 rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs" type="number" min={0} value={nextStockTotal} onChange={(e) => setNextStockTotal(e.target.value)} placeholder="Stock" />
          <input className="w-24 rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs" type="number" min={0} value={nextStockReserved} onChange={(e) => setNextStockReserved(e.target.value)} placeholder="Reserved" />
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={nextAvailable} onChange={(e) => setNextAvailable(e.target.checked)} />
            Available
          </label>
          <button onClick={save} disabled={loading} className="btn-primary text-xs disabled:opacity-60">
            {loading ? "Saving..." : "Save"}
          </button>
          {message ? <p className="text-[10px] text-emerald-700">{message}</p> : null}
          {error ? <p className="text-[10px] text-rose-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
