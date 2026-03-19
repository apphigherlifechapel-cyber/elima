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

export default async function AdminWholesaleApplicationsPage() {
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

  const applications = await prisma.wholesaleApplication.findMany({
    orderBy: { submittedAt: "desc" },
    include: { user: true },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-600",
    };
    return map[status] ?? "bg-zinc-100 text-zinc-600";
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wholesale Applications</h1>
        <Link href="/admin" className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50">← Dashboard</Link>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {applications.map((app: any) => (
              <tr key={app.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium">{app.companyName}</td>
                <td className="px-4 py-3">{app.user.email}</td>
                <td className="px-4 py-3">
                  {app.website ? (
                    <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {app.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(app.status)}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">{new Date(app.submittedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-zinc-500 max-w-[160px] truncate">{app.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {applications.length === 0 && (
          <p className="p-6 text-center text-zinc-500">No wholesale applications yet.</p>
        )}
      </div>
    </div>
  );
}
