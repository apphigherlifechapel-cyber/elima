"use client";

import { useState } from "react";

type OrderActionRow = {
  id: string;
  fulfillmentStatus: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "EXPIRED";
  status: "PENDING" | "PAID" | "CANCELLED";
  shipment?: {
    carrier?: string | null;
    trackingNumber?: string | null;
  } | null;
};

type StaffOrderActionsProps = {
  order: OrderActionRow;
};

export default function StaffOrderActions({ order }: StaffOrderActionsProps) {
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus);
  const [orderStatus, setOrderStatus] = useState(order.status);
  const [carrier, setCarrier] = useState(order.shipment?.carrier || "");
  const [trackingNumber, settrackingNumber] = useState(order.shipment?.trackingNumber || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          fulfillmentStatus,
          orderStatus,
          carrier: carrier || undefined,
          trackingNumber: trackingNumber || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update order");
      } else {
        setMessage("Order updated.");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2.5">
      <div className="grid gap-2">
        <select value={fulfillmentStatus} onChange={(e) => setFulfillmentStatus(e.target.value as OrderActionRow["fulfillmentStatus"])} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1.5 text-xs">
          <option value="PENDING">PENDING</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="SHIPPED">SHIPPED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
        <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value as OrderActionRow["status"])} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1.5 text-xs">
          <option value="PENDING">PENDING</option>
          <option value="PAID">PAID</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1.5 text-xs" placeholder="Carrier" />
        <input value={trackingNumber} onChange={(e) => settrackingNumber(e.target.value)} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1.5 text-xs" placeholder="Tracking number" />
      </div>
      <button onClick={save} disabled={loading} className="btn-primary w-full text-xs disabled:opacity-60">
        {loading ? "Saving..." : "Update"}
      </button>
      {message ? <p className="text-[10px] text-emerald-700">{message}</p> : null}
      {error ? <p className="text-[10px] text-rose-600">{error}</p> : null}
    </div>
  );
}
