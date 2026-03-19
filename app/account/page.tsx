import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { items: { include: { product: true } } },
      },
      addresses: { where: { isDefault: true }, take: 1 },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">My Account</h1>

      {/* Profile */}
      <section className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Profile</h2>
        <p className="text-zinc-700"><span className="font-medium">Name:</span> {user.name ?? "—"}</p>
        <p className="text-zinc-700"><span className="font-medium">Email:</span> {user.email}</p>
        <p className="text-zinc-700"><span className="font-medium">Account type:</span> {user.accountType}</p>
        <p className="text-zinc-700"><span className="font-medium">Role:</span> {user.role}</p>
      </section>

      {/* Recent Orders */}
      <section className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Recent Orders</h2>
        {user.orders.length === 0 ? (
          <p className="text-zinc-500">You haven&apos;t placed any orders yet. <Link href="/shop" className="text-blue-600 hover:underline">Start shopping</Link></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="pb-2 pr-4">Order ID</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Items</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {user.orders.map((order: any) => (
                  <tr key={order.id}>
                    <td className="py-2 pr-4 font-mono text-xs">{order.id.slice(0, 8)}…</td>
                    <td className="py-2 pr-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{order.items.length}</td>
                    <td className="py-2 pr-4 font-medium">₦{order.total.toFixed(2)}</td>
                    <td className="py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        order.status === "PAID" ? "bg-green-100 text-green-700" :
                        order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        "bg-zinc-100 text-zinc-600"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Default Address */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Default Address</h2>
        {user.addresses.length === 0 ? (
          <p className="text-zinc-500">No default address saved.</p>
        ) : (
          <address className="not-italic text-zinc-700">
            <p>{user.addresses[0].line1}</p>
            {user.addresses[0].line2 && <p>{user.addresses[0].line2}</p>}
            <p>{user.addresses[0].city}, {user.addresses[0].state} {user.addresses[0].postalCode}</p>
            <p>{user.addresses[0].country}</p>
          </address>
        )}
      </section>
    </div>
  );
}
