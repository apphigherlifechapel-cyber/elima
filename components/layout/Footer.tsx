import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-14 border-t border-[var(--border-soft)] bg-[var(--surface)]">
      <div className="page-wrap py-10 sm:py-12">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">Elima Commerce</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
                Premium Retail + Wholesale Infrastructure
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700 sm:text-base">
                Elima helps brands and merchants sell beautifully to consumers while operating robust wholesale flows for scale.
              </p>
              <form className="mt-5 flex max-w-md gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
                <button type="submit" className="btn-primary rounded-xl px-4 py-2.5 text-xs font-black">
                  Subscribe
                </button>
              </form>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--foreground)]">Shop</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted-foreground)]">
                  <Link href="/shop" className="hover:text-[var(--foreground)]">All Products</Link>
                  <Link href="/shop?sort=new" className="hover:text-[var(--foreground)]">New Arrivals</Link>
                  <Link href="/request-quote" className="hover:text-[var(--foreground)]">Request Quote</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--foreground)]">Wholesale</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted-foreground)]">
                  <Link href="/wholesale" className="hover:text-[var(--foreground)]">Portal</Link>
                  <Link href="/apply-wholesale" className="hover:text-[var(--foreground)]">Apply</Link>
                  <Link href="/wholesale/quotes" className="hover:text-[var(--foreground)]">Quotes</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--foreground)]">Support</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted-foreground)]">
                  <Link href="/contact" className="hover:text-[var(--foreground)]">Contact</Link>
                  <Link href="/delivery-info" className="hover:text-[var(--foreground)]">Delivery</Link>
                  <Link href="/return-policy" className="hover:text-[var(--foreground)]">Returns</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--border-soft)] pt-4 text-xs text-[var(--muted-foreground)] sm:flex sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Elima Store. All rights reserved.</p>
            <div className="mt-2 flex flex-wrap gap-3 sm:mt-0">
              <Link href="/return-policy" className="hover:text-[var(--foreground)]">Privacy</Link>
              <Link href="/return-policy" className="hover:text-[var(--foreground)]">Terms</Link>
              <span className="rounded border border-[var(--border-soft)] px-2 py-0.5">Paystack</span>
              <span className="rounded border border-[var(--border-soft)] px-2 py-0.5">Visa</span>
              <span className="rounded border border-[var(--border-soft)] px-2 py-0.5">Mastercard</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

