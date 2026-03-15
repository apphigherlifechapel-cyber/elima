"use client";

import { useState } from "react";

type DiscountRow = {
  id: string;
  name: string;
  code: string;
  discountType: string;
  value: number;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
};

type DiscountManagerProps = {
  initialDiscounts: DiscountRow[];
};

export default function DiscountManager({ initialDiscounts }: DiscountManagerProps) {
  const [discounts, setDiscounts] = useState(initialDiscounts);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("PERCENT");
  const [value, setValue] = useState("0");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/discounts");
    const data = await res.json();
    if (res.ok) setDiscounts(data.discounts || []);
  }

  async function createDiscount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name,
        code,
        discountType,
        value: Number(value),
        startsAt,
        endsAt: endsAt || null,
        active,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create discount");
      return;
    }
    setMessage("Discount created.");
    setName("");
    setCode("");
    setValue("0");
    setStartsAt("");
    setEndsAt("");
    setActive(true);
    await refresh();
  }

  async function toggleDiscount(id: string) {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to toggle discount");
      return;
    }
    setMessage("Discount updated.");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createDiscount} className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">Create Discount</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
          <select className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
            <option value="PERCENT">Percent</option>
            <option value="FIXED">Fixed</option>
          </select>
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" type="number" min={0} step="0.01" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} required />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </div>
        <button className="btn-primary mt-3">Create</button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="soft-card overflow-x-auto rounded-2xl p-5">
        <h2 className="text-lg font-black">Discounts</h2>
        <table className="mt-3 w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Code</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Value</th>
              <th className="px-2 py-2">Starts</th>
              <th className="px-2 py-2">Ends</th>
              <th className="px-2 py-2">Active</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((discount) => (
              <tr key={discount.id} className="border-t border-[var(--border-soft)]">
                <td className="px-2 py-3">{discount.name}</td>
                <td className="px-2 py-3 font-semibold">{discount.code}</td>
                <td className="px-2 py-3">{discount.discountType}</td>
                <td className="px-2 py-3">{discount.value}</td>
                <td className="px-2 py-3 text-xs text-[var(--muted-foreground)]">{new Date(discount.startsAt).toLocaleString()}</td>
                <td className="px-2 py-3 text-xs text-[var(--muted-foreground)]">{discount.endsAt ? new Date(discount.endsAt).toLocaleString() : "-"}</td>
                <td className="px-2 py-3">{discount.active ? "Yes" : "No"}</td>
                <td className="px-2 py-3">
                  <button onClick={() => toggleDiscount(discount.id)} className="btn-secondary text-xs">
                    Toggle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
