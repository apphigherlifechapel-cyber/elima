"use client";

import { useState } from "react";

export default function RequestQuotePage() {
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, field: "productId" | "quantity", value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "quantity" ? Math.max(1, Number(value || 1)) : value,
            }
          : item
      )
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.filter((item) => item.productId.trim()).map((item) => ({ ...item, variantId: null })),
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit quote");
        return;
      }
      setMessage(`Quote submitted (${data.quote.id}).`);
      setItems([{ productId: "", quantity: 1 }]);
      setNotes("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrap py-8 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="soft-card rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Wholesale</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Request Quote</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Add product IDs and quantities. Our team will review and respond with custom pricing.</p>
        </section>

        <form onSubmit={onSubmit} className="soft-card space-y-4 rounded-2xl p-5">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm sm:col-span-2" placeholder="Product ID" value={item.productId} onChange={(e) => updateItem(index, "productId", e.target.value)} />
              <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" type="number" min={1} value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
            </div>
          ))}

          <button type="button" onClick={() => setItems((prev) => [...prev, { productId: "", quantity: 1 }])} className="btn-secondary text-sm">
            Add Item
          </button>

          <textarea className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" rows={4} placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
            {loading ? "Submitting..." : "Submit Quote Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
