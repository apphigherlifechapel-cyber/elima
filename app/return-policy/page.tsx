export default function ReturnPolicyPage() {
  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass fade-in-up rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary-strong)]">Policy</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Return Policy</h1>
          <div className="mt-6 space-y-3">
            <div className="soft-card fade-in-up stagger-1 rounded-2xl p-4 sm:p-5">
              <h2 className="text-sm font-black text-[var(--foreground)]">Standard Returns</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                Eligible items can be returned within the approved window when unused and in original condition.
              </p>
            </div>
            <div className="soft-card fade-in-up stagger-2 rounded-2xl p-4 sm:p-5">
              <h2 className="text-sm font-black text-[var(--foreground)]">Wholesale & Quote Orders</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                Bulk and quote-converted orders may have custom return terms. Contact support before initiating a return.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
