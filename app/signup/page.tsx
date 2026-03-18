"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      router.push("/login?registered=1");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[85vh] overflow-hidden pb-16 pt-12 sm:pt-20">
      {/* Premium Background Elements */}
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 translate-y-[-20%] rounded-[100%] bg-[var(--primary-strong)] opacity-[0.05] blur-[120px]" />
      <div className="absolute right-[-10%] top-[40%] -z-10 h-[400px] w-[400px] rounded-[100%] bg-blue-500 opacity-[0.04] blur-[100px]" />

      <div className="page-wrap relative">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="glass fade-in-up flex flex-col items-center justify-center rounded-[2.5rem] p-8 shadow-2xl shadow-black/[0.03] sm:p-10">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--background)] shadow-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Create account</h1>
            <p className="mt-2 text-center text-sm font-medium text-[var(--muted-foreground)]">Join the Elima Store ecosystem today.</p>

            <form onSubmit={handleSubmit} className="mt-8 w-full space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input-premium w-full bg-[var(--surface)] text-sm shadow-inner transition-all hover:bg-[var(--background)] focus:bg-[var(--background)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="input-premium w-full bg-[var(--surface)] text-sm shadow-inner transition-all hover:bg-[var(--background)] focus:bg-[var(--background)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="input-premium w-full bg-[var(--surface)] text-sm shadow-inner transition-all hover:bg-[var(--background)] focus:bg-[var(--background)]"
                />
              </div>

              {error && (
                <div className="animate-in fade-in slide-in-from-top-1 w-full rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-center text-sm font-bold text-rose-700 backdrop-blur-md">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary mt-2 w-full transform rounded-full py-3.5 text-sm font-black uppercase tracking-wider shadow-lg shadow-black/10 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? "Creating account..." : "Create account securely"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-medium text-[var(--muted-foreground)]">
              Already have an account?{" "}
              <Link href="/login" className="font-extrabold text-[var(--foreground)] underline decoration-[var(--border-strong)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--primary-strong)] hover:decoration-[var(--primary-strong)]">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

