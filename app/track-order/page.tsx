"use client";

import { useState } from "react";
import { formatCedis } from "@/lib/utils/currency";

type TrackResult = {
  id: string;
  status: string;
  fulfillmentStatus: string;
  total: number;
  createdAt: string;
  paymentStatus: string | null;
  shipmentStatus: string | null;
  trackingNumber: string | null;
  itemCount: number;
};

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const url = `/api/orders/track?orderId=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to find order");
      } else {
        setResult(data.order);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="mx-auto w-full max-w-2xl">
          <div className="glass fade-in-up rounded-3xl p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary-strong)]">Orders</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Track Order</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Enter your order ID and checkout email to view status.</p>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                className="input-premium w-full"
                placeholder="Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              />
              <input
                className="input-premium w-full"
                placeholder="Email used for order"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={loading} className="btn-primary rounded-2xl px-5 py-2.5 text-sm font-black disabled:opacity-60">
                {loading ? "Checking..." : "Track"}
              </button>
            </form>

            {error ? <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          </div>

          {result ? (
            <div className="soft-card fade-in-up stagger-1 mt-5 rounded-3xl p-5 text-sm sm:p-6">
              <h2 className="text-base font-black text-[var(--foreground)]">Order Snapshot</h2>
              <div className="mt-3 grid gap-2 text-[var(--foreground)] sm:grid-cols-2">
                <p><strong>Order:</strong> {result.id}</p>
                <p><strong>Status:</strong> {result.status}</p>
                <p><strong>Fulfillment:</strong> {result.fulfillmentStatus}</p>
                <p><strong>Payment:</strong> {result.paymentStatus || "N/A"}</p>
                <p><strong>Shipment:</strong> {result.shipmentStatus || "N/A"}</p>
                <p><strong>Tracking #:</strong> {result.trackingNumber || "N/A"}</p>
                <p><strong>Items:</strong> {result.itemCount}</p>
                <p><strong>Total:</strong> {formatCedis(result.total)}</p>
                <p className="sm:col-span-2"><strong>Created:</strong> {new Date(result.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}



