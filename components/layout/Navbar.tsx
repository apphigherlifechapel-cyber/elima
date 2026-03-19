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
  const isVendor = user?.role === "VENDOR";

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
      <div className="fixed top-0 left-0 right-0 z-[60] pt-4 px-4 sm:px-6 pointer-events-none flex justify-center fade-in">
        <nav className="glass-nav rounded-full px-4 sm:px-6 transition-all duration-500 pointer-events-auto w-full max-w-6xl flex h-16 sm:h-20 items-center justify-between shadow-2xl overflow-hidden">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5 sm:h-6 sm:w-6 transition-all group-hover:text-emerald-400">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">Elima</span>
          </Link>

          <div className="hidden items-center gap-9 text-[13px] font-bold uppercase tracking-[0.1em] text-zinc-600 lg:flex">
            {[
              { href: "/shop", label: "Shop" },
              { href: "/wholesale", label: "Wholesale" },
              { href: "/vendor/onboarding", label: "Sell" },
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
            {isAdmin && (
              <Link href="/admin" className="rounded-full bg-[var(--primary-strong)] px-4 py-2 text-[11px] font-black text-white transition hover:bg-emerald-700">
                ADMIN PANEL
              </Link>
            )}
            {isVendor && !isAdmin && (
              <Link href="/vendor/dashboard" className="rounded-full bg-zinc-900 px-4 py-2 text-[11px] font-black text-white transition hover:bg-zinc-800">
                VENDOR PORTAL
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Nav Icons (Cart, Wishlist) - visible on all screens */}
            <Link href="/wishlist" className="group hidden relative rounded-full p-2.5 text-zinc-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 sm:block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </Link>
            <Link href="/cart" className="group relative rounded-full p-2.5 text-zinc-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 sm:h-6 sm:w-6">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </Link>

            <div className="hidden h-4 w-px bg-zinc-200 lg:block mx-1" />

            {/* Desktop Auth State */}
            {session ? (
              <div className="hidden items-center gap-4 lg:flex">
                <Link href="/account" className="flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-white px-3 py-1.5 shadow-sm transition hover:border-[var(--primary-strong)]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary-strong)] text-[10px] font-bold text-white">
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-[13px] font-bold text-zinc-900">{user?.name ?? user?.email?.split("@")[0]}</span>
                </Link>
              </div>
            ) : (
              <div className="hidden items-center gap-4 lg:flex">
                <Link href="/login" className="text-[13px] font-bold text-zinc-600 transition hover:text-emerald-700">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary py-2 px-5 text-[11px] font-black uppercase tracking-wider">
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile Auth Avatar - Only shows if logged in */}
            {session && (
              <Link href="/account" className="flex h-8 w-8 lg:hidden items-center justify-center rounded-full bg-[var(--primary-strong)] text-[12px] font-bold text-white shadow-sm ring-2 ring-white">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </Link>
            )}

            <button
              onClick={() => setOpen(true)}
              className="rounded-full bg-zinc-100 p-2 text-zinc-900 transition-all duration-300 hover:bg-emerald-100 hover:scale-110 lg:hidden focus:ring-4 focus:ring-emerald-500/20"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </nav>
      </div>

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
                { href: "/vendor/onboarding", label: "Sell on Elima" },
                { href: "/request-quote", label: "Request a Quote" },
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

              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--primary-strong)] p-4 text-white hover:bg-emerald-700"
                >
                  <span className="text-xl font-black tracking-tight">Admin Dashboard</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </Link>
              )}

              {isVendor && !isAdmin && (
                <Link 
                  href="/vendor/dashboard" 
                  className="mt-6 flex items-center justify-between rounded-2xl bg-zinc-900 p-4 text-white hover:bg-zinc-800"
                >
                  <span className="text-xl font-black tracking-tight">Vendor Portal</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>

            <div className="mt-auto pt-8 border-t border-zinc-100">
              {session ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-strong)] text-lg font-bold text-white shadow-lg">
                      {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--muted-foreground)]">Logged in as</p>
                      <p className="font-black text-emerald-950">{user?.name || user?.email}</p>
                    </div>
                  </div>
                  <Link href="/account" className="block text-lg font-black text-zinc-900 bg-zinc-50 rounded-xl p-3 hover:bg-zinc-100 transition-colors">My Profile</Link>
                  <Link href="/track-order" className="block text-lg font-black text-zinc-900 bg-zinc-50 rounded-xl p-3 hover:bg-zinc-100 transition-colors">Order Tracking</Link>
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="block w-full text-left text-lg font-black text-red-500 bg-red-50 rounded-xl p-3 hover:bg-red-100 transition-colors mt-2">Sign Out</button>
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

