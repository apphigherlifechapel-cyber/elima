"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (result?.error || !result?.ok) {
      setLoading(false);
      setError("Invalid email or password. Please try again.");
    } else {
      // Full browser reload ensures the HttpOnly session cookie is read globally
      window.location.replace("/");
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Welcome back</h1>
            <p className="mt-2 text-center text-sm font-medium text-[var(--muted-foreground)]">Sign in to Elima Store to continue.</p>

            {registered && (
              <div className="mt-6 w-full rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-center text-sm font-bold text-emerald-800 backdrop-blur-md">
                Account created. You can now sign in!
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 w-full space-y-5">
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
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                    Password
                  </label>
                  <Link href="#" className="text-xs font-bold text-[var(--primary-strong)] hover:underline">
                    Forgot?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                {loading ? "Authenticating..." : "Sign in securely"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-medium text-[var(--muted-foreground)]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-extrabold text-[var(--foreground)] underline decoration-[var(--border-strong)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--primary-strong)] hover:decoration-[var(--primary-strong)]">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

