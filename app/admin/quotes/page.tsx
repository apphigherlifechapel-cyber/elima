import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return user?.role === "ADMIN" ? user : null;
}

export default async function AdminQuotesPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-zinc-600">Admins only.</p>
        <Link href="/login" className="mt-4 inline-block text-blue-600 hover:underline">Sign in</Link>
      </div>
    );
  }

  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, items: { include: { product: true } } },
    take: 100,
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: "bg-zinc-100 text-zinc-600",
      PENDING: "bg-yellow-100 text-yellow-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-600",
      CONVERTED: "bg-blue-100 text-blue-700",
    };
    return map[status] ?? "bg-zinc-100 text-zinc-600";
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Link href="/admin" className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50">← Dashboard</Link>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Quote ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {quotes.map((q: any) => (
              <tr key={q.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-mono text-xs">{q.id.slice(0, 8)}…</td>
                <td className="px-4 py-3">{q.user.email}</td>
                <td className="px-4 py-3">{q.items.length}</td>
                <td className="px-4 py-3 font-medium">₦{q.total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(q.status)}`}>
                    {q.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">{new Date(q.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotes.length === 0 && (
          <p className="p-6 text-center text-zinc-500">No quotes yet.</p>
        )}
      </div>
    </div>
  );
}
