import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import QuoteActionButtons from "@/components/admin/QuoteActionButtons";
import { formatCedis } from "@/lib/utils/currency";
import { Product, Quote, QuoteItem, User } from "@prisma/client";
import QuoteRepriceForm from "@/components/admin/QuoteRepriceForm";
import Link from "next/link";

type AdminQuoteRow = Quote & {
  user: Pick<User, "email" | "name">;
  items: Array<QuoteItem & { product: Pick<Product, "id" | "title"> }>;
};

function tone(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "PENDING" || status === "REVIEWING") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border-soft)]";
}

export default async function AdminQuotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const quotes: AdminQuoteRow[] = await prisma.quote.findMany({
    include: {
      user: { select: { email: true, name: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Wholesale Workflow</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Quotes</h1>
      </section>

      <section className="soft-card overflow-x-auto rounded-2xl p-4 sm:p-5">
        <table className="w-full min-w-[990px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2">Quote ID</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Items</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote: AdminQuoteRow) => (
              <tr key={quote.id} className="border-t border-[var(--border-soft)] align-top">
                <td className="px-3 py-3 font-mono text-xs">{quote.id.slice(0, 10)}...</td>
                <td className="px-3 py-3">{quote.user.email}</td>
                <td className="px-3 py-3">{quote.items.length}</td>
                <td className="px-3 py-3 font-semibold">{formatCedis(quote.total)}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone(quote.status)}`}>
                    {quote.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-[var(--muted-foreground)]">{new Date(quote.createdAt).toLocaleString()}</td>
                <td className="px-3 py-3">
                  <Link href={`/admin/quotes/${quote.id}`} className="btn-secondary mb-2 inline-flex text-xs">
                    Open Detail
                  </Link>
                  <QuoteActionButtons quoteId={quote.id} status={quote.status} />
                  <QuoteRepriceForm
                    quoteId={quote.id}
                    items={quote.items.map((item) => ({
                      id: item.id,
                      productId: item.productId,
                      productTitle: item.product?.title || null,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                    }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
