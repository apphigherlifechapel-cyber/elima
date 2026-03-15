"use client";

import { useState } from "react";

type SettingRow = {
  id: string;
  key: string;
  value: string;
};

type SettingsManagerProps = {
  initialSettings: SettingRow[];
};

export default function SettingsManager({ initialSettings }: SettingsManagerProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [keyName, setKeyName] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    if (res.ok) setSettings(data.settings || []);
  }

  async function upsertSetting(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyName.trim(), value }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save setting");
      return;
    }

    setMessage("Setting saved.");
    setKeyName("");
    setValue("");
    await refresh();
  }

  const recsEnabled = settings.find((s) => s.key === "recommendations_enabled")?.value !== "false";

  async function toggleRecommendations() {
    setError(null);
    setMessage(null);
    const next = recsEnabled ? "false" : "true";
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "recommendations_enabled", value: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update recommendation setting");
      return;
    }
    setMessage(`Recommendations ${next === "true" ? "enabled" : "disabled"}.`);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">Recommendations Switch</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Enable or disable personalized recommendations site-wide.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${recsEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-100 text-zinc-700"}`}>
            {recsEnabled ? "Enabled" : "Disabled"}
          </span>
          <button type="button" onClick={toggleRecommendations} className="btn-secondary text-sm">
            {recsEnabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      <div className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">Recommendation Weight Tuning</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Use keys below in the form to tune the phase-2 ranking model.</p>
        <div className="mt-3 grid gap-2 text-xs text-[var(--muted-foreground)] sm:grid-cols-2">
          <p><span className="font-mono text-[11px]">rec_weight_view</span> (default 2)</p>
          <p><span className="font-mono text-[11px]">rec_weight_add_to_bag</span> (default 4)</p>
          <p><span className="font-mono text-[11px]">rec_weight_purchase</span> (default 8)</p>
          <p><span className="font-mono text-[11px]">rec_weight_category_affinity</span> (default 2)</p>
          <p><span className="font-mono text-[11px]">rec_weight_wholesale_boost</span> (default 4)</p>
          <p><span className="font-mono text-[11px]">rec_weight_value_boost</span> (default 2)</p>
          <p><span className="font-mono text-[11px]">rec_weight_newcomer_price_boost</span> (default 2)</p>
          <p><span className="font-mono text-[11px]">rec_weight_popularity_boost</span> (default 2)</p>
        </div>
      </div>

      <form onSubmit={upsertSetting} className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">Add / Update Setting</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Key (e.g. site_name)" value={keyName} onChange={(e) => setKeyName(e.target.value)} required />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
        <button className="btn-primary mt-3">Save Setting</button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">Current Settings</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-2 py-2">Key</th>
                <th className="px-2 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-2 py-3 font-mono text-xs">{setting.key}</td>
                  <td className="px-2 py-3">{setting.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
