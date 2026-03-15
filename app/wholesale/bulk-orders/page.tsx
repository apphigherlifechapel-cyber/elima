import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { Order, OrderItem, Payment } from "@prisma/client";
import { formatCedis } from "@/lib/utils/currency";

type WholesaleOrderRow = Order & { items: OrderItem[]; payment: Payment | null };

function orderStatusTone(status: string) {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default async function WholesaleBulkOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return <div className="p-8">Unauthorized</div>;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return <div className="p-8">User not found</div>;

  if (user.wholesaleStatus !== "APPROVED" && user.role !== "ADMIN") {
    return (
      <div className="pb-16 pt-8 sm:pt-10">
        <div className="page-wrap">
          <div className="glass rounded-3xl p-8 sm:p-10">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Wholesale Bulk Orders</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Your wholesale account is not approved yet.</p>
            <Link href="/apply-wholesale" className="btn-primary mt-5 rounded-xl px-5 py-2.5 text-sm font-black">
              Apply / Update Application
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const orders: WholesaleOrderRow[] = await prisma.order.findMany({
    where: {
      userId: user.id,
      OR: [{ type: "WHOLESALE" }, { type: "QUOTE_CONVERTED" }],
    },
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalValue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const paidCount = orders.filter((o) => o.status === "PAID").length;

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">Wholesale</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Bulk Orders</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your wholesale and quote-converted order activity.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Orders</p>
            <p className="mt-2 text-3xl font-black text-[var(--foreground)]">{orders.length}</p>
          </article>
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Paid</p>
            <p className="mt-2 text-3xl font-black text-[var(--foreground)]">{paidCount}</p>
          </article>
          <article className="soft-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Order Value</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">{formatCedis(totalValue)}</p>
          </article>
        </div>

        <div className="soft-card mt-6 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Order ID</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Type</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Items</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Total</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Order Status</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Payment</th>
                  <th className="px-4 py-3 font-black uppercase tracking-[0.08em]">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--border-soft)] last:border-b-0">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--foreground)]">{order.id}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{order.type}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{order.items.length}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{formatCedis(Number(order.total || 0))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${orderStatusTone(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{order.payment?.status || "N/A"}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{new Date(order.createdAt).toLocaleString()}</td>
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

