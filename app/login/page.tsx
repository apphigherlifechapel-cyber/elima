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
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="mx-auto w-full max-w-md">
          <div className="glass fade-in-up rounded-3xl p-6 sm:p-8">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Sign in</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Welcome back to Elima Store.</p>

            {registered && (
              <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Account created. You can now sign in.
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--foreground)]">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-premium w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--foreground)]">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="input-premium w-full"
                />
              </div>

              {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full rounded-2xl py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-[var(--primary-strong)] hover:underline">
                Create one
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

