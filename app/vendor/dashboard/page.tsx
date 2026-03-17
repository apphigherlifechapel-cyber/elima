import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export default async function VendorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login?callbackUrl=/vendor/dashboard");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { vendor: true }
  });

  if (!user?.vendor) redirect("/vendor/onboarding");
  if (!user.vendor.isVerified) {
    return (
      <div className="page-container py-24 text-center">
        <h2 className="text-2xl font-black">Hold tight!</h2>
        <p className="mt-4 text-zinc-500 font-bold">Your vendor account is approved, but we're still finalizing your dashboard access.</p>
        <Link href="/account" className="mt-8 inline-block btn-primary px-8 py-3 rounded-full">Back to Account</Link>
      </div>
    );
  }

  const [productCount, orderItems] = await Promise.all([
    prisma.product.count({ where: { vendorId: user.vendor.id } }),
    prisma.orderItem.findMany({
      where: { vendorId: user.vendor.id },
      include: { order: true }
    })
  ]);

  const totalSales = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const pendingFulfillment = orderItems.filter(i => i.fulfillmentStatus === "PENDING").length;

  return (
    <div className="min-h-screen bg-zinc-50/30">
      <div className="page-container py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-black text-zinc-900">{user.vendor.storeName} Dashboard</h1>
            <p className="mt-2 text-zinc-400 font-black uppercase tracking-widest text-xs">Vendor Command Center</p>
          </div>
          <Link href="/vendor/products/new" className="btn-primary rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700">
            List New Product
          </Link>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
           <div className="rounded-3xl bg-white p-6 border border-zinc-100 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Revenue</p>
             <p className="text-2xl font-black text-emerald-600 mt-2">₦{totalSales.toLocaleString()}</p>
           </div>
           <div className="rounded-3xl bg-white p-6 border border-zinc-100 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Products</p>
             <p className="text-2xl font-black text-zinc-900 mt-2">{productCount}</p>
           </div>
           <div className="rounded-3xl bg-white p-6 border border-zinc-100 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pending Fulfillment</p>
             <p className="text-2xl font-black text-amber-500 mt-2">{pendingFulfillment}</p>
           </div>
           <div className="rounded-3xl bg-white p-6 border border-zinc-100 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Elima Commission</p>
             <p className="text-2xl font-black text-zinc-400 mt-2">{(user.vendor.commissionRate * 100)}%</p>
           </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
             <div className="rounded-3xl bg-white p-8 border border-zinc-100 shadow-sm">
                <h3 className="text-lg font-black text-zinc-900 mb-6">Recent Order Items</h3>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="border-b border-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                         <th className="pb-4">Order ID</th>
                         <th className="pb-4">Qty</th>
                         <th className="pb-4">Amount</th>
                         <th className="pb-4">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-50">
                       {orderItems.slice(0, 10).map((item) => (
                         <tr key={item.id} className="text-sm">
                           <td className="py-4 font-bold text-zinc-900">#{item.orderId.slice(-6)}</td>
                           <td className="py-4 font-bold text-zinc-500">{item.quantity}x</td>
                           <td className="py-4 font-black">₦{item.totalPrice.toLocaleString()}</td>
                           <td className="py-4">
                             <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                               item.fulfillmentStatus === "SHIPPED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                             }`}>
                               {item.fulfillmentStatus}
                             </span>
                           </td>
                         </tr>
                       ))}
                       {orderItems.length === 0 && (
                         <tr>
                            <td colSpan={4} className="py-12 text-center text-zinc-400 font-bold italic">No sales recorded yet.</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="rounded-3xl bg-zinc-900 p-8 text-white">
                <h3 className="text-lg font-black italic">Elima Vendor Tip</h3>
                <p className="mt-4 text-sm font-bold text-zinc-400 leading-relaxed">
                   Vendors with high-quality 4k lifestyle images see a **45% higher conversion rate** on Elima Store. Keep your product shots editorial!
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
