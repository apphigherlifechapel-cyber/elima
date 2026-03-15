export default function DeliveryInfoPage() {
  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass fade-in-up rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary-strong)]">Shipping</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Delivery Information</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="soft-card fade-in-up stagger-1 rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Retail Orders</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                Standard timelines vary by location. You can choose a delivery method during checkout.
              </p>
            </div>
            <div className="soft-card fade-in-up stagger-2 rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Wholesale & Bulk</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                Dispatch timelines may vary based on stock preparation, packaging, and order volume.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Tracking details are provided once shipment processing begins.</p>
        </div>
      </div>
    </div>
  );
}
