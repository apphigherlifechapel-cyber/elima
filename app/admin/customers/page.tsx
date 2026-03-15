import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { Order, User, WholesaleApplication } from "@prisma/client";
import { formatCedis } from "@/lib/utils/currency";

type AdminCustomerRow = User & {
  orders: Pick<Order, "id" | "total" | "status">[];
  wholesaleApplication: Pick<WholesaleApplication, "status" | "companyName"> | null;
};

function statusTone(status: string) {
  if (status === "APPROVED" || status === "ACTIVE") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "PENDING") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border-soft)]";
}

export default async function AdminCustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const users: AdminCustomerRow[] = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      orders: { select: { id: true, total: true, status: true } },
      wholesaleApplication: { select: { status: true, companyName: true } },
    },
  });

  const wholesaleCount = users.filter((u) => u.accountType === "WHOLESALE").length;

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Customers</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Retail + Wholesale Accounts</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Total Users</p>
            <p className="text-xl font-black">{users.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Wholesale Users</p>
            <p className="text-xl font-black">{wholesaleCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Retail Users</p>
            <p className="text-xl font-black">{users.length - wholesaleCount}</p>
          </div>
        </div>
      </section>

      <section className="soft-card overflow-x-auto rounded-2xl p-4 sm:p-5">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Wholesale</th>
              <th className="px-3 py-2">Orders</th>
              <th className="px-3 py-2">Lifetime</th>
              <th className="px-3 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const paidOrders = user.orders.filter((o) => o.status === "PAID");
              const lifetime = paidOrders.reduce((sum, o) => sum + o.total, 0);
              const wholesaleStatus = user.wholesaleApplication?.status || user.wholesaleStatus;
              return (
                <tr key={user.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-3 py-3 font-semibold">{user.name || "-"}</td>
                  <td className="px-3 py-3">{user.email}</td>
                  <td className="px-3 py-3">{user.role}</td>
                  <td className="px-3 py-3">{user.accountType}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusTone(wholesaleStatus)}`}>
                      {wholesaleStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3">{user.orders.length}</td>
                  <td className="px-3 py-3 font-semibold">{formatCedis(lifetime)}</td>
                  <td className="px-3 py-3 text-xs text-[var(--muted-foreground)]">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
