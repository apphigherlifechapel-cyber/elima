import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { Product, Quote, QuoteItem } from "@prisma/client";
import { formatCedis } from "@/lib/utils/currency";

type WholesaleQuoteRow = Quote & {
  items: Array<QuoteItem & { product: Pick<Product, "title"> }>;
};

function statusTone(status: string) {
  if (status === "APPROVED" || status === "CONVERTED_TO_ORDER") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "REVIEWING") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default async function WholesaleQuotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return <div className="p-8">Unauthorized</div>;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return <div className="p-8">User not found</div>;

  if (user.wholesaleStatus !== "APPROVED" && user.role !== "ADMIN") {
    return (
      <div className="pb-16 pt-8 sm:pt-10">
        <div className="page-wrap">
          <div className="glass rounded-3xl p-8 sm:p-10">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Wholesale Quotes</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Your wholesale account is not approved yet.</p>
            <Link href="/apply-wholesale" className="btn-primary mt-5 rounded-xl px-5 py-2.5 text-sm font-black">
              Apply / Update Application
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const quotes: WholesaleQuoteRow[] = await prisma.quote.findMany({
    where: { userId: user.id },
    include: {
      items: { include: { product: { select: { title: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalValue = quotes.reduce((sum, q) => sum + Number(q.total || 0), 0);

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">Wholesale</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Quote Requests</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Track quote lifecycle from submission to conversion.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Total Quotes</p>
            <p className="mt-2 text-3xl font-black text-[var(--foreground)]">{quotes.length}</p>
          </article>
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Approved</p>
            <p className="mt-2 text-3xl font-black text-[var(--foreground)]">{quotes.filter((q) => q.status === "APPROVED").length}</p>
          </article>
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Estimated Value</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">{formatCedis(totalValue)}</p>
          </article>
        </div>

        <div className="soft-card mt-6 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Quote ID</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Items</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Total</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Status</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Created</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-[var(--border-soft)] last:border-b-0">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--foreground)]">{quote.id}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{quote.items.length}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{formatCedis(Number(quote.total || 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{new Date(quote.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

