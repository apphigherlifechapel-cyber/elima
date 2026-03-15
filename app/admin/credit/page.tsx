"use client";

import { useCallback, useEffect, useState } from "react";

type Profile = {
  userId: string;
  limit: number;
  used: number;
  termsDays: 15 | 30;
  active: boolean;
};

export default function AdminCreditPage() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("100000");
  const [limit, setLimit] = useState("500000");
  const [used, setUsed] = useState("0");
  const [termsDays, setTermsDays] = useState<15 | 30>(30);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [evaluation, setEvaluation] = useState<{ allowed: boolean; reason: string; remaining?: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/advanced/credit?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    setProfile(data.profile || null);
  }, [userId]);

  async function saveProfile() {
    setMessage(null);
    const res = await fetch("/api/advanced/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set",
        userId,
        limit: Number(limit),
        used: Number(used),
        termsDays,
        active: true,
      }),
    });
    const data = await res.json();
    setProfile(data.profile || null);
    setMessage("Credit profile saved.");
  }

  async function evaluate() {
    setMessage(null);
    const res = await fetch("/api/advanced/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "evaluate", userId, amount: Number(amount) }),
    });
    const data = await res.json();
    setEvaluation(data.result || null);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5">
        <h1 className="text-2xl font-black">B2B Credit Terms</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Configure wholesale credit limits and net terms.</p>
      </section>

      <section className="soft-card rounded-2xl p-5 grid gap-3 sm:grid-cols-2">
        <input className="input-premium" placeholder="Wholesale userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input className="input-premium" placeholder="Credit limit" value={limit} onChange={(e) => setLimit(e.target.value)} />
        <input className="input-premium" placeholder="Used" value={used} onChange={(e) => setUsed(e.target.value)} />
        <select className="input-premium" value={termsDays} onChange={(e) => setTermsDays(Number(e.target.value) as 15 | 30)}>
          <option value={15}>Net 15</option>
          <option value={30}>Net 30</option>
        </select>
        <button onClick={saveProfile} className="btn-primary">Save Profile</button>
      </section>

      <section className="soft-card rounded-2xl p-5 grid gap-3 sm:grid-cols-2">
        <input className="input-premium" placeholder="Order amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button onClick={evaluate} className="btn-secondary">Evaluate Credit</button>
      </section>

      {profile ? (
        <section className="soft-card rounded-2xl p-5 text-sm">
          <p><span className="font-bold">Profile:</span> {profile.userId}</p>
          <p><span className="font-bold">Limit:</span> {profile.limit}</p>
          <p><span className="font-bold">Used:</span> {profile.used}</p>
          <p><span className="font-bold">Terms:</span> Net {profile.termsDays}</p>
        </section>
      ) : null}

      {evaluation ? (
        <section className="soft-card rounded-2xl p-5 text-sm">
          <p><span className="font-bold">Decision:</span> {evaluation.allowed ? "ALLOW" : "DENY"}</p>
          <p><span className="font-bold">Reason:</span> {evaluation.reason}</p>
          {typeof evaluation.remaining === "number" ? <p><span className="font-bold">Remaining:</span> {evaluation.remaining}</p> : null}
        </section>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
