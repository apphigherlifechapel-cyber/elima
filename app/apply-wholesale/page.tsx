"use client";

import { useState } from "react";

export default function ApplyWholesalePage() {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit application");
        return;
      }
      setMessage("Application submitted. We will review it shortly.");
      setCompanyName("");
      setWebsite("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrap py-8 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="soft-card rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Wholesale</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Apply for Wholesale Account</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Submit your business details for review and approval.</p>
        </section>

        <form onSubmit={onSubmit} className="soft-card space-y-4 rounded-2xl p-5">
          <div>
            <label className="mb-1 block text-sm font-medium">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Your business name" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Website (optional)</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="https://example.com" />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
