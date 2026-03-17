"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { StyleConcierge } from "../ai/StyleConcierge"; // Added import

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = user?.role === "ADMIN";

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [open]);

  // Close menu on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="sticky top-0 z-[60] glass-nav transition-all duration-300">
        <div className="page-container flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-[-0.03em] text-emerald-950">Elima</span>
          </Link>

          <div className="hidden items-center gap-9 text-[13px] font-bold uppercase tracking-[0.1em] text-zinc-600 lg:flex">
            {[
              { href: "/shop", label: "Shop" },
              { href: "/wholesale", label: "Wholesale" },
              { href: "/request-quote", label: "Quote" },
              { href: "/track-order", label: "Track" },
            ].map((item) => (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`transition-colors hover:text-emerald-700 ${pathname === item.href ? "text-emerald-700" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link href="/admin" className="rounded-full bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-800 transition hover:bg-emerald-100">
                ADMIN
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 lg:flex">
              <Link href="/wishlist" className="group relative rounded-full p-2.5 text-zinc-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </Link>
              <Link href="/cart" className="group relative rounded-full p-2.5 text-zinc-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </Link>

              <div className="mx-2 h-4 w-px bg-zinc-200" />

              {session ? (
                <div className="flex items-center gap-4">
                  <Link href="/account" className="text-[13px] font-bold text-zinc-900 transition hover:text-emerald-700">
                    {user?.name ?? user?.email?.split("@")[0]}
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="text-[13px] font-bold text-zinc-400 transition hover:text-red-500">
                    Log out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-[13px] font-bold text-zinc-600 transition hover:text-emerald-700">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-primary py-2 px-5 text-[11px] font-black uppercase tracking-wider">
                    Sign up
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={() => setOpen(true)}
              className="rounded-full bg-zinc-100 p-2.5 text-zinc-900 transition hover:bg-emerald-100 lg:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Slide-over Drawer (Mobile) */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div 
          className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex h-full flex-col p-8">
            <div className="flex items-center justify-between mb-10">
              <span className="text-xl font-black text-emerald-950">Menu</span>
              <button 
                onClick={() => setOpen(false)}
                className="rounded-full bg-zinc-100 p-2 text-zinc-500 hover:bg-zinc-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {[
                { href: "/shop", label: "Shop Catalog" },
                { href: "/wholesale", label: "Wholesale Portal" },
                { href: "/request-quote", label: "Request a Quote" },
                { href: "/track-order", label: "Track Your Order" },
                { href: "/about", label: "Our Story" },
              ].map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className="block text-2xl font-black tracking-tight text-zinc-900 transition-colors hover:text-emerald-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-auto pt-8 border-t border-zinc-100">
              {session ? (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-zinc-500">Logged in as {user?.email}</p>
                  <Link href="/account" className="block text-lg font-black text-zinc-900">My Account</Link>
                  <button onClick={() => signOut()} className="text-lg font-black text-red-500">Sign Out</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/login" className="btn-secondary py-3 text-center">Log In</Link>
                  <Link href="/signup" className="btn-primary py-3 text-center">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

