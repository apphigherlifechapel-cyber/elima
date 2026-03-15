export default function AboutPage() {
  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass fade-in-up rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary-strong)]">About</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Built for Retail and Wholesale Growth</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
            Elima Store is a hybrid ecommerce platform serving fashion, beauty, accessories, and general goods with separate retail and wholesale buying flows.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
            We support direct shopping, quote workflows, wholesale approvals, and bulk pricing so individuals and business buyers can order with confidence.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="soft-card fade-in-up stagger-1 rounded-2xl p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Retail Ready</p>
              <p className="mt-2 text-sm text-[var(--foreground)]">Fast browsing, guest checkout, secure payment flow.</p>
            </div>
            <div className="soft-card fade-in-up stagger-2 rounded-2xl p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Wholesale Native</p>
              <p className="mt-2 text-sm text-[var(--foreground)]">MOQ, quotes, account approval, and bulk ordering.</p>
            </div>
            <div className="soft-card fade-in-up stagger-3 rounded-2xl p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Operations Focused</p>
              <p className="mt-2 text-sm text-[var(--foreground)]">Admin, inventory, reporting, and fulfillment controls.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
