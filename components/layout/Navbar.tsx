"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  return (
    <nav className="sticky top-0 z-50 glass-nav">
      <div className="page-wrap flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--foreground)] text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-[var(--foreground)]">Elima</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-semibold text-[var(--muted-foreground)] lg:flex">
          <Link href="/shop" className="hover:text-[var(--foreground)]">Shop</Link>
          <Link href="/wholesale" className="hover:text-[var(--foreground)]">Wholesale</Link>
          <Link href="/request-quote" className="hover:text-[var(--foreground)]">Quote</Link>
          <Link href="/track-order" className="hover:text-[var(--foreground)]">Track</Link>
          {isAdmin ? <Link href="/admin" className="btn-secondary rounded-full px-3 py-1.5 text-xs font-black">Admin</Link> : null}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/wishlist" className="rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" title="Wishlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>
          <Link href="/cart" className="rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" title="Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </Link>

          {session ? (
            <>
              <Link href="/account" className="ml-2 text-sm font-semibold text-[var(--foreground)] hover:underline">
                {user?.name ?? user?.email?.split("@")[0]}
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary rounded-full px-4 py-2 text-xs font-black">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 text-[var(--foreground)] hover:bg-[var(--surface-2)] lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[var(--border-soft)] bg-[var(--surface)]/95 lg:hidden">
          <div className="page-wrap py-3">
            <div className="grid gap-1">
              {[
                { href: "/shop", label: "Shop" },
                { href: "/wholesale", label: "Wholesale" },
                { href: "/request-quote", label: "Quote" },
                { href: "/track-order", label: "Track Order" },
              ].map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]">
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Link href="/wishlist" onClick={() => setOpen(false)} className="btn-secondary flex-1 rounded-xl py-2 text-center text-xs font-black">Wishlist</Link>
              <Link href="/cart" onClick={() => setOpen(false)} className="btn-secondary flex-1 rounded-xl py-2 text-center text-xs font-black">Cart</Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

