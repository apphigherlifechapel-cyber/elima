export default function ContactPage() {
  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass fade-in-up rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary-strong)]">Contact</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Get in Touch</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="soft-card fade-in-up stagger-1 rounded-2xl p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Email</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">support@elima.com</p>
            </div>
            <div className="soft-card fade-in-up stagger-2 rounded-2xl p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Phone</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">+233 000 000 000</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Business hours: Monday to Saturday, 9:00 AM to 6:00 PM.</p>
        </div>
      </div>
    </div>
  );
}

