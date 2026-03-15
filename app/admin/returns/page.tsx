"use client";

import { useEffect, useState } from "react";

type ReturnRequest = {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "COMPLETED";
  createdAt: string;
};

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);

  async function load() {
    const res = await fetch("/api/advanced/returns");
    const data = await res.json();
    setRequests(data.requests || []);
  }

  async function update(id: string, status: ReturnRequest["status"]) {
    await fetch("/api/advanced/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, status }),
    });
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5">
        <h1 className="text-2xl font-black">Return Requests</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Automated returns portal moderation.</p>
      </section>

      <section className="soft-card rounded-2xl p-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-2 py-2">Request</th>
              <th className="px-2 py-2">Order</th>
              <th className="px-2 py-2">User</th>
              <th className="px-2 py-2">Reason</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-[var(--border-soft)]">
                <td className="px-2 py-3 font-mono text-xs">{request.id}</td>
                <td className="px-2 py-3">{request.orderId}</td>
                <td className="px-2 py-3">{request.userId}</td>
                <td className="px-2 py-3">{request.reason}</td>
                <td className="px-2 py-3">{request.status}</td>
                <td className="px-2 py-3 flex gap-2">
                  <button onClick={() => update(request.id, "APPROVED")} className="btn-secondary text-xs">Approve</button>
                  <button onClick={() => update(request.id, "REJECTED")} className="btn-secondary text-xs">Reject</button>
                  <button onClick={() => update(request.id, "COMPLETED")} className="btn-primary text-xs">Complete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
