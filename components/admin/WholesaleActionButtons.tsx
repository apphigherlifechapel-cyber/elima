"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type WholesaleActionButtonsProps = {
  userId: string;
};

export default function WholesaleActionButtons({ userId }: WholesaleActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch("/api/admin/wholesale-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update application");
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
    <div className="flex items-center gap-2">
      <button
        onClick={() => update("APPROVED")}
        disabled={loading !== null}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading === "APPROVED" ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={() => update("REJECTED")}
        disabled={loading !== null}
        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
      >
        {loading === "REJECTED" ? "Rejecting..." : "Reject"}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
