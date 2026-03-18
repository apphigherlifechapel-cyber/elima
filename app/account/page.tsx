import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import CancelOrderButton from "@/components/account/CancelOrderButton";
import { formatCedis } from "@/lib/utils/currency";
import { Order, OrderItem, Payment } from "@prisma/client";
import { BiometricSettings } from "@/components/auth/BiometricSettings";

type AccountOrder = Order & { payment: Payment | null; items: OrderItem[] };

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="relative min-h-[85vh] overflow-hidden pb-16 pt-12 sm:pt-20">
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 translate-y-[-30%] rounded-[100%] bg-[var(--primary-strong)] opacity-[0.05] blur-[100px]" />
        <div className="page-wrap relative">
          <div className="glass fade-in-up mx-auto max-w-xl rounded-[2.5rem] p-10 text-center shadow-2xl shadow-black/[0.03] sm:p-14">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[var(--foreground)] text-[var(--background)] shadow-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-10 w-10">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Secure Access</h1>
            <p className="mt-3 text-base font-medium text-[var(--muted-foreground)]">Please sign in to view your personalized dashboard and orders.</p>
            <Link href="/login" className="btn-primary mt-8 inline-flex rounded-full px-8 py-3.5 text-sm font-black uppercase tracking-wider shadow-lg transition-transform active:scale-95">
              Sign in securely
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
    <div className="relative min-h-screen overflow-hidden pb-20 pt-12 sm:pt-16">
      {/* Immersive Background Gradients */}
      <div className="absolute left-[-10%] top-[-10%] -z-10 h-[600px] w-[600px] rounded-[100%] bg-emerald-400 opacity-[0.05] blur-[120px] mix-blend-multiply" />
      <div className="absolute right-[-10%] top-[30%] -z-10 h-[500px] w-[500px] rounded-[100%] bg-[var(--primary-strong)] opacity-[0.04] blur-[100px] mix-blend-multiply" />

      <div className="page-wrap relative">
        {/* Dashboard Header */}
        <div className="glass fade-in-up flex flex-col items-start justify-between gap-6 rounded-[2.5rem] p-8 shadow-xl shadow-[var(--border-soft)] sm:flex-row sm:items-center sm:p-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-5xl">Dashboard</h1>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--background)] px-3 py-1 text-xs font-bold text-[var(--muted-foreground)] shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              {user.email}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-black uppercase tracking-widest sm:text-sm">
            <Link href="/account/addresses" className="btn-secondary rounded-full px-6 py-3 transition-transform active:scale-95">Manage Addresses</Link>
            <Link href="/track-order" className="btn-secondary rounded-full px-6 py-3 transition-transform active:scale-95">Track Orders</Link>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
           <div className="fade-in-up stagger-1">
             <BiometricSettings />
           </div>
           <div className="glass fade-in-up stagger-2 relative overflow-hidden rounded-[2.5rem] border-0 p-8 shadow-xl shadow-[var(--border-soft)]">
             <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[var(--primary-strong)] opacity-5 blur-2xl" />
             <div className="relative z-10">
               <h3 className="text-2xl font-black tracking-tight text-[var(--foreground)]">Wholesale Portal</h3>
               <p className="mt-2 text-sm font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                 Status <span className="ml-2 inline-flex items-center rounded-md bg-[var(--foreground)] px-2 py-0.5 text-[10px] text-[var(--background)]">{user.wholesaleStatus}</span>
               </p>
               <p className="mt-4 text-sm text-[var(--muted-foreground)] max-w-sm">Access exclusive bulk pricing, direct vendor messaging, and specialized shipping logic.</p>
               <Link href="/wholesale" className="btn-primary mt-8 inline-flex rounded-full px-8 py-3.5 text-xs font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95">
                  Launch Portal
               </Link>
             </div>
           </div>
        </div>

        {/* Orders Table */}
        <div className="glass fade-in-up stagger-3 mt-8 overflow-hidden rounded-[2.5rem] p-6 shadow-xl shadow-[var(--border-soft)] sm:p-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-[var(--foreground)]">Recent Orders</h2>
            <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] shadow-sm sm:flex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-[var(--foreground)]">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                <path d="M15 2H9c-1.1 0-2 .9-2 2v2h10V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--background)]/50 p-12 text-center text-sm font-medium text-[var(--muted-foreground)]">
              You haven&apos;t placed any orders yet. Discover our latest collection.
              <br />
              <Link href="/shop" className="mt-4 inline-block font-extrabold text-[var(--foreground)] underline decoration-[var(--primary-strong)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--primary-strong)]">Start shopping</Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--background)]/60 p-1">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-xs font-black uppercase tracking-widest text-[var(--muted-foreground)]">
                    <th className="px-5 py-4">Order ID</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4 text-center">Items</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {orders.map((order: AccountOrder) => (
                    <tr key={order.id} className="group transition-colors hover:bg-[var(--surface)] hover:shadow-sm">
                      <td className="px-5 py-4 font-mono text-[11px] font-bold tracking-tight text-[var(--foreground)]">{order.id}</td>
                      <td className="px-5 py-4 text-[13px] font-medium text-[var(--muted-foreground)]">
                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 text-center font-bold">{order.items.length}</td>
                      <td className="px-5 py-4 font-black">{formatCedis(order.total)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                          order.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 
                          order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {order.status === "PENDING" ? <CancelOrderButton orderId={order.id} /> : <span className="text-[10px] font-bold text-[var(--muted-foreground)]">COMPLETED</span>}
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


