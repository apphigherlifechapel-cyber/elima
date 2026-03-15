import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";

const WHOLESALE_HERO = "https://images.unsplash.com/photo-1556742393-d75f468bfcb0?auto=format&fit=crop&w=2200&q=90";

const wholesaleCapabilities = [
  {
    title: "Account Approval Workflow",
    description: "Structured onboarding for verified wholesale buyers and business identities.",
  },
  {
    title: "Quote-to-Order Conversion",
    description: "Submit quote requests, review pricing, and convert approved quotes into orders quickly.",
  },
  {
    title: "MOQ & Tiered Pricing Controls",
    description: "Access wholesale rates with quantity thresholds and category-driven inventory planning.",
  },
];

function statusTone(status: string) {
  if (status === "APPROVED") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "REJECTED") return "text-rose-700 bg-rose-50 border-rose-200";
  return "text-amber-700 bg-amber-50 border-amber-200";
}

export default async function WholesalePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="pb-16 pt-8 sm:pt-10">
        <div className="page-wrap">
          <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border-soft)]">
            <Image src={WHOLESALE_HERO} alt="Wholesale operations and growth" fill className="object-cover" priority unoptimized />
            <div className="absolute inset-0 bg-gradient-to-r from-black/84 via-black/58 to-black/24" />
            <div className="relative z-10 min-h-[360px] p-6 sm:p-10">
              <p className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white backdrop-blur">
                Elima B2B
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Wholesale Infrastructure for Serious Buyers
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                Sign in to access account approval status, quote workflows, and bulk order operations.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-zinc-900 hover:bg-white/90" href="/login">
                  Sign in
                </Link>
                <Link className="rounded-2xl border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-black text-white backdrop-blur hover:bg-white/20" href="/apply-wholesale">
                  Apply for wholesale
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {wholesaleCapabilities.map((item) => (
              <article key={item.title} className="soft-card rounded-3xl p-5 sm:p-6">
                <h2 className="text-lg font-black tracking-tight text-[var(--foreground)]">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{item.description}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return <div className="page-wrap py-12 text-sm text-red-600">User not found.</div>;

  const application = await prisma.wholesaleApplication.findUnique({ where: { userId: user.id } });
  const quoteCount = await prisma.quote.count({ where: { userId: user.id } });
  const bulkOrderCount = await prisma.order.count({ where: { userId: user.id, type: { in: ["WHOLESALE", "QUOTE_CONVERTED"] } } });

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <section className="glass rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">Wholesale Control Center</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Welcome Back, {user.name || "Partner"}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Account: {user.email}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusTone(user.wholesaleStatus)}`}>
              {user.wholesaleStatus}
            </span>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--foreground)]">
              {user.accountType}
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Quote Requests</p>
            <p className="mt-2 text-3xl font-black text-[var(--foreground)]">{quoteCount}</p>
          </article>
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Bulk Orders</p>
            <p className="mt-2 text-3xl font-black text-[var(--foreground)]">{bulkOrderCount}</p>
          </article>
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Application</p>
            <p className="mt-2 text-lg font-black text-[var(--foreground)]">{application ? "Submitted" : "Not Submitted"}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="soft-card rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-black text-[var(--foreground)]">Application & Status Details</h2>
            <div className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
              <p>
                Account type: <span className="font-bold text-[var(--foreground)]">{user.accountType}</span>
              </p>
              <p>
                Wholesale status: <span className="font-bold text-[var(--foreground)]">{user.wholesaleStatus}</span>
              </p>
            </div>

            {application ? (
              <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 text-sm">
                <p className="font-semibold text-[var(--foreground)]">Company: {application.companyName}</p>
                <p className="mt-1 text-[var(--muted-foreground)]">Submitted: {new Date(application.submittedAt).toLocaleString()}</p>
                {application.reviewedAt ? (
                  <p className="text-[var(--muted-foreground)]">Reviewed: {new Date(application.reviewedAt).toLocaleString()}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted-foreground)]">No wholesale application on file.</p>
            )}
          </article>

          <article className="soft-card rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-black text-[var(--foreground)]">Actions</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <Link href="/apply-wholesale" className="btn-secondary rounded-xl px-4 py-2 text-xs font-black">Submit / Update Application</Link>
              <Link href="/wholesale/quotes" className="btn-secondary rounded-xl px-4 py-2 text-xs font-black">View Quote Requests</Link>
              <Link href="/wholesale/bulk-orders" className="btn-secondary rounded-xl px-4 py-2 text-xs font-black">View Bulk Orders</Link>
              <Link href="/request-quote" className="btn-secondary rounded-xl px-4 py-2 text-xs font-black">Request a Quote</Link>
              <Link href="/shop" className="btn-secondary rounded-xl px-4 py-2 text-xs font-black">Browse Products</Link>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

