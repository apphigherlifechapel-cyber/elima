import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { formatCedis } from "@/lib/utils/currency";
import QuoteDetailActions from "@/components/admin/QuoteDetailActions";
import { AdminAuditLog, Product, Quote, QuoteItem, User } from "@prisma/client";

type QuoteDetailItemRow = QuoteItem & { product: Pick<Product, "id" | "title"> };
type QuoteDetailRow = Quote & {
  user: Pick<User, "id" | "email" | "name">;
  items: QuoteDetailItemRow[];
};
type QuoteAuditLogRow = AdminAuditLog & { user: Pick<User, "email" | "name"> | null };

type PageProps = {
  params: Promise<{ id: string }>;
};

function tone(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "PENDING" || status === "REVIEWING") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border-soft)]";
}

export default async function AdminQuoteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const quote: QuoteDetailRow | null = await prisma.quote.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!quote) {
    return <div className="p-8">Quote not found</div>;
  }

  const logs: QuoteAuditLogRow[] = await prisma.adminAuditLog.findMany({
    where: { entity: "Quote", entityId: quote.id },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Quote Detail</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{quote.id.slice(0, 12)}...</h1>
          </div>
          <Link href="/admin/quotes" className="btn-secondary text-xs">Back to Quotes</Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="soft-card rounded-2xl p-5">
            <h2 className="text-lg font-black">Summary</h2>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p>User: <span className="font-semibold">{quote.user.email}</span></p>
              <p>
                Status:{" "}
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone(quote.status)}`}>
                  {quote.status}
                </span>
              </p>
              <p>Total: <span className="font-semibold">{formatCedis(quote.total)}</span></p>
              <p>Created: <span className="text-[var(--muted-foreground)]">{new Date(quote.createdAt).toLocaleString()}</span></p>
            </div>
            {quote.notes ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">Notes: {quote.notes}</p> : null}
          </div>

          <div className="soft-card rounded-2xl p-5">
            <h2 className="text-lg font-black">Items</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">Product ID</th>
                    <th className="px-2 py-2">Qty</th>
                    <th className="px-2 py-2">Unit</th>
                    <th className="px-2 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item: QuoteDetailItemRow) => (
                    <tr key={item.id} className="border-t border-[var(--border-soft)]">
                      <td className="px-2 py-3">{item.product.title}</td>
                      <td className="px-2 py-3 font-mono text-xs">{item.productId}</td>
                      <td className="px-2 py-3">{item.quantity}</td>
                      <td className="px-2 py-3">{formatCedis(item.unitPrice)}</td>
                      <td className="px-2 py-3 font-semibold">{formatCedis(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <QuoteDetailActions
            quoteId={quote.id}
            status={quote.status}
            items={quote.items.map((item) => ({
              id: item.id,
              productId: item.productId,
              productTitle: item.product.title,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }))}
          />

          <div className="soft-card rounded-2xl p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.13em] text-[var(--muted-foreground)]">Audit Timeline</h3>
            <div className="mt-3 space-y-2.5">
              {logs.length === 0 ? <p className="text-xs text-[var(--muted-foreground)]">No audit logs yet.</p> : null}
              {logs.map((log: QuoteAuditLogRow) => (
                <div key={log.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2.5">
                  <p className="text-xs font-bold">{log.action}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">{new Date(log.createdAt).toLocaleString()}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">{log.user?.email || "System"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
