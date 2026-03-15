"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ObservabilityControlsProps = {
  initialRetentionHours: number;
};

export default function ObservabilityControls({ initialRetentionHours }: ObservabilityControlsProps) {
  const [retentionHours, setRetentionHours] = useState<number>(initialRetentionHours);
  const [confirmValue, setConfirmValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

  async function saveRetention() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/observability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "setRetention", retentionHours }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to update retention");
      } else {
        setMessage("Retention updated.");
        router.refresh();
      }
    } catch {
      setMessage("Failed to update retention");
    } finally {
      setBusy(false);
    }
  }

  async function clearLogs() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/observability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearLogs", confirm: confirmValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to clear logs");
      } else {
        setMessage(`Logs cleared (${data.removed || 0} removed).`);
        setConfirmValue("");
        const params = new URLSearchParams(searchParams.toString());
        router.push(`/admin/observability?${params.toString()}`);
        router.refresh();
      }
    } catch {
      setMessage("Failed to clear logs");
    } finally {
      setBusy(false);
    }
  }

  async function runCleanupNow() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/observability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "runCleanup", retentionHours }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to run cleanup");
      } else {
        setMessage(`Cleanup completed. Removed ${data.removed || 0} event(s).`);
        router.refresh();
      }
    } catch {
      setMessage("Failed to run cleanup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="soft-card rounded-2xl p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Retention & Safety</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
          <p className="text-xs text-[var(--muted-foreground)]">Retention Window (hours)</p>
          <div className="mt-2 flex items-center gap-2">
            <select
              value={retentionHours}
              onChange={(e) => setRetentionHours(Number(e.target.value))}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            >
              {[6, 12, 24, 48, 72, 168, 336, 720].map((value) => (
                <option key={value} value={value}>{value}h</option>
              ))}
            </select>
            <button type="button" onClick={saveRetention} disabled={busy} className="btn-secondary text-xs disabled:opacity-60">
              Save
            </button>
            <button type="button" onClick={runCleanupNow} disabled={busy} className="btn-secondary text-xs disabled:opacity-60">
              Run Cleanup Now
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-bold text-rose-700">Danger Zone</p>
          <p className="mt-1 text-xs text-rose-700">Type `CLEAR` then remove all events.</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              placeholder="CLEAR"
              className="w-24 rounded-xl border border-rose-200 bg-white px-2 py-1.5 text-xs"
            />
            <button type="button" onClick={clearLogs} disabled={busy || confirmValue !== "CLEAR"} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50">
              Clear Logs
            </button>
          </div>
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-[var(--muted-foreground)]">{message}</p> : null}
    </section>
  );
}
