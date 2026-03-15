"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QuoteActionButtonsProps = {
  quoteId: string;
  status: string;
};

export default function QuoteActionButtons({ quoteId, status }: QuoteActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "REVIEW" | "APPROVE" | "REJECT" | "CONVERT") {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "REVIEWING" && (
        <button onClick={() => run("REVIEW")} disabled={!!loading} className="btn-secondary text-xs">
          {loading === "REVIEW" ? "..." : "Review"}
        </button>
      )}
      {status !== "APPROVED" && (
        <button onClick={() => run("APPROVE")} disabled={!!loading} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
          {loading === "APPROVE" ? "..." : "Approve"}
        </button>
      )}
      {status !== "REJECTED" && (
        <button onClick={() => run("REJECT")} disabled={!!loading} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
          {loading === "REJECT" ? "..." : "Reject"}
        </button>
      )}
      {status === "APPROVED" && (
        <button onClick={() => run("CONVERT")} disabled={!!loading} className="btn-primary text-xs">
          {loading === "CONVERT" ? "..." : "Convert"}
        </button>
      )}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
