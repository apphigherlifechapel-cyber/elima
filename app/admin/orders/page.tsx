import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { Order, Shipment } from "@prisma/client";
import { formatCedis } from "@/lib/utils/currency";
import StaffOrderActions from "@/components/admin/StaffOrderActions";

type AdminOrderRow = Order & {
  user?: { email: string | null };
  payment?: { status: string | null } | null;
  shipment?: Shipment | null;
};

function statusTone(status: string) {
  if (["PAID", "DELIVERED", "SHIPPED"].includes(status)) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (["PENDING", "PROCESSING"].includes(status)) return "bg-amber-100 text-amber-700 border-amber-200";
  if (["CANCELLED", "EXPIRED"].includes(status)) return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border-soft)]";
}

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p>You must be logged in to view this page.</p>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p>You do not have sufficient permissions to view this page.</p>
      </div>
    );
  }

  const orders: AdminOrderRow[] = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, payment: true, shipment: true, shippingAddress: true, billingAddress: true },
    take: 80,
  });

  const paidCount = orders.filter((o) => o.status === "PAID").length;
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Operations</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Orders</h1>
          </div>
          <Link href="/admin" className="btn-secondary text-xs">Back to Dashboard</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Total</p>
            <p className="text-xl font-black">{orders.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Paid</p>
            <p className="text-xl font-black text-emerald-700">{paidCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Pending</p>
            <p className="text-xl font-black text-amber-700">{pendingCount}</p>
          </div>
        </div>
      </section>

      <section className="soft-card overflow-x-auto rounded-2xl p-4 sm:p-5">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Fulfillment</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-[var(--border-soft)] align-top">
                <td className="px-3 py-3 font-mono text-xs">{order.id.slice(0, 10)}...</td>
                <td className="px-3 py-3">{order.user?.email ?? "-"}</td>
                <td className="px-3 py-3 font-semibold">{formatCedis(order.total)}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(order.status)}`}>{order.status}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(order.fulfillmentStatus)}`}>
                    {order.fulfillmentStatus}
                  </span>
                </td>
                <td className="px-3 py-3">{order.payment?.status ?? "N/A"}</td>
                <td className="px-3 py-3 text-xs text-[var(--muted-foreground)]">{new Date(order.createdAt).toLocaleString()}</td>
                <td className="px-3 py-3">
                  <StaffOrderActions
                    order={{
                      id: order.id,
                      fulfillmentStatus: order.fulfillmentStatus,
                      status: order.status,
                      shipment: order.shipment
                        ? {
                            carrier: order.shipment.carrier,
                            trackingNumber: order.shipment.trackingNumber,
                          }
                        : null,
                    }}
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
