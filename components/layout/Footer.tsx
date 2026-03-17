import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-zinc-200/50 bg-zinc-50/30">
      <div className="page-container py-20 pb-40 lg:pb-20">
        <div className="grid gap-16 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-10">
            <div>
              <Link href="/" className="flex items-center gap-3 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950 text-white shadow-lg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-2xl font-black tracking-[-0.03em] text-emerald-950">Elima</span>
              </Link>
              <p className="mt-6 max-w-sm text-lg leading-relaxed text-zinc-600">
                The standard in premium African retail and wholesale infrastructure. Built for growth and global reach.
              </p>
            </div>

            <div className="flex flex-wrap gap-8">
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Newsletter</p>
                <form className="flex max-w-md gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="input-premium bg-white"
                  />
                  <button type="submit" className="btn-primary py-3 px-6 text-[11px] font-black uppercase tracking-widest">
                    Join
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
            <div className="space-y-6">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Collections</p>
              <nav className="flex flex-col gap-4 text-[13px] font-bold text-zinc-500">
                <Link href="/shop" className="hover:text-emerald-700 transition-colors">Catalog</Link>
                <Link href="/shop?sort=new" className="hover:text-emerald-700 transition-colors">Arrivals</Link>
                <Link href="/wholesale" className="hover:text-emerald-700 transition-colors">Wholesale</Link>
                <Link href="/request-quote" className="hover:text-emerald-700 transition-colors">Quotes</Link>
              </nav>
            </div>
            <div className="space-y-6">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Company</p>
              <nav className="flex flex-col gap-4 text-[13px] font-bold text-zinc-500">
                <Link href="/about" className="hover:text-emerald-700 transition-colors">Story</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition-colors">Contact</Link>
                <Link href="/careers" className="hover:text-emerald-700 transition-colors">Careers</Link>
              </nav>
            </div>
            <div className="space-y-6">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">Legal</p>
              <nav className="flex flex-col gap-4 text-[13px] font-bold text-zinc-500">
                <Link href="/return-policy" className="hover:text-emerald-700 transition-colors">Returns</Link>
                <Link href="/return-policy" className="hover:text-emerald-700 transition-colors">Privacy</Link>
                <Link href="/return-policy" className="hover:text-emerald-700 transition-colors">Terms</Link>
              </nav>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-zinc-200/60 pt-10 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-bold text-zinc-400">
            &copy; {new Date().getFullYear()} Elima Global Commerce. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 grayscale opacity-60">
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-600">Paystack</div>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-600">Visa</div>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-600">Momo</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

