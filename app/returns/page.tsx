"use client";

import { useState } from "react";

export default function ReturnsPage() {
  const [orderId, setOrderId] = useState("");
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const res = await fetch("/api/advanced/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", orderId, userId, reason }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to submit return request");
      return;
    }

    setMessage(`Return request submitted: ${data.request.id}`);
    setOrderId("");
    setReason("");
  }

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap max-w-3xl">
        <section className="soft-card rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Returns Portal</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Request a Return</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Submit return requests with reason codes for automated review.</p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input className="input-premium w-full" placeholder="Order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} required />
            <input className="input-premium w-full" placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} required />
            <textarea className="input-premium w-full min-h-[100px]" placeholder="Reason for return" value={reason} onChange={(e) => setReason(e.target.value)} required />
            <button type="submit" className="btn-primary">Submit Return Request</button>
          </form>

          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}
