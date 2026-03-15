"use client";

import { useEffect, useState } from "react";

type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
};

const initialForm = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  isDefault: false,
};

export default function AddressBookPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/addresses");
    const data = await res.json();
    if (res.ok) setAddresses(data.addresses || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, action: "create" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save address");
      } else {
        setMessage("Address saved.");
        setForm(initialForm);
        await load();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) await load();
  }

  async function setDefault(id: string) {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setDefault", id }),
    });
    if (res.ok) await load();
  }

  return (
    <div className="page-wrap py-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="soft-card rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Account</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Address Book</h1>
        </section>

        <form onSubmit={submit} className="soft-card grid gap-3 rounded-2xl p-5 sm:grid-cols-2">
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Address line 1" value={form.line1} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Set as default
          </label>
          <button disabled={loading} className="btn-primary disabled:opacity-60">{loading ? "Saving..." : "Save Address"}</button>
        </form>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        <div className="grid gap-3">
          {addresses.map((address) => (
            <div key={address.id} className="soft-card rounded-2xl p-4">
              <p className="font-semibold">
                {address.label} {address.isDefault ? <span className="text-xs text-emerald-700">(Default)</span> : null}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state}, {address.country} {address.postalCode}
              </p>
              <div className="mt-3 flex gap-2">
                {!address.isDefault ? <button onClick={() => setDefault(address.id)} className="btn-secondary text-xs">Make Default</button> : null}
                <button onClick={() => remove(address.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
