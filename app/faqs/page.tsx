export default function FaqPage() {
  const faqs = [
    {
      q: "Do you support wholesale pricing?",
      a: "Yes. Apply for wholesale and get approved to unlock wholesale pricing, MOQ rules, and bulk workflows.",
    },
    {
      q: "How are payments verified?",
      a: "Every payment is verified server-side before fulfillment starts. Client-side success alone is never trusted.",
    },
    {
      q: "Can I request a quote?",
      a: "Yes. Use the Request Quote page to submit products and quantities, then track quote status in your account.",
    },
    {
      q: "Can guests place retail orders?",
      a: "Yes. Retail checkout supports guest buyers, while wholesale ordering requires an approved wholesale account.",
    },
  ];

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass fade-in-up rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--primary-strong)]">Support</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Frequently Asked Questions</h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--muted-foreground)] sm:text-base">Quick answers for retail buyers, wholesale customers, and first-time visitors.</p>

          <div className="mt-7 space-y-3">
            {faqs.map((item, index) => (
              <div key={item.q} className={`soft-card fade-in-up rounded-2xl p-4 sm:p-5 ${index < 4 ? `stagger-${index + 1}` : ""}`}>
                <h2 className="text-sm font-black text-[var(--foreground)] sm:text-base">{item.q}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
