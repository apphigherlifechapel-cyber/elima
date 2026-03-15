import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import CancelOrderButton from "@/components/account/CancelOrderButton";
import { formatCedis } from "@/lib/utils/currency";
import { Order, OrderItem, Payment } from "@prisma/client";

type AccountOrder = Order & { payment: Payment | null; items: OrderItem[] };

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="pb-16 pt-8 sm:pt-10">
        <div className="page-wrap">
          <div className="glass fade-in-up rounded-3xl p-8 text-center sm:p-12">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">My Account</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Please sign in to view your account details.</p>
            <Link href="/login" className="btn-primary mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-bold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return (
      <div className="pb-16 pt-8 sm:pt-10">
        <div className="page-wrap">
          <div className="glass fade-in-up rounded-3xl p-8">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">My Account</h1>
            <p className="mt-2 text-red-600">Account profile not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const orders: AccountOrder[] = await prisma.order.findMany({
    where: { userId: user.id },
    include: { payment: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass fade-in-up rounded-3xl p-5 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">My Account</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Signed in as {user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
            <Link href="/account/addresses" className="btn-secondary rounded-full px-4 py-2">Manage Addresses</Link>
            <Link href="/track-order" className="btn-secondary rounded-full px-4 py-2">Track an Order</Link>
          </div>
        </div>

        <div className="soft-card fade-in-up stagger-1 mt-6 rounded-2xl p-4 sm:p-6">
          <h2 className="text-xl font-black text-[var(--foreground)]">Recent Orders</h2>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">You have no orders yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] divide-y divide-[var(--border-soft)] text-left text-xs sm:text-sm">
                <thead className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2">Order ID</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Items</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Order Status</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {orders.map((order: AccountOrder) => (
                    <tr key={order.id}>
                      <td className="px-3 py-2 font-mono text-xs">{order.id}</td>
                      <td className="px-3 py-2">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">{order.items.length}</td>
                      <td className="px-3 py-2 font-semibold">{formatCedis(order.total)}</td>
                      <td className="px-3 py-2">{order.status}</td>
                      <td className="px-3 py-2">{order.payment?.status || "N/A"}</td>
                      <td className="px-3 py-2 text-right">
                        {order.status === "PENDING" ? <CancelOrderButton orderId={order.id} /> : <span className="text-xs text-[var(--muted-foreground)]">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


